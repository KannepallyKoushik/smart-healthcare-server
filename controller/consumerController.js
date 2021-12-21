const enivironment = require("dotenv").config;
const math = require("mathjs");
const pool = require("../db");
var amqp = require("amqplib/callback_api");

exports.consumeData = async (req, res) => {
  try {
    const { patient_id } = req.body;
    const d = new Date();
    const date_of_diagnosis =
      d.getDate() + "-" + d.getMonth() + "-" + d.getFullYear();

    const consumer = await pool.query(
      "Insert into consumer(id, date_of_diagnosis) values($1,$2) RETURNING consumer_id",
      [patient_id, date_of_diagnosis]
    );
    const consuming_id = consumer.rows[0].consumer_id;

    res.status(201).json({
      message:
        "You can start collecting data from each sensor now with this ID",
      consume_id: consuming_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

exports.raiseAlert = async (req, res) => {
  try {
    const { mac_addr } = req.body;
    console.log("Raising an Alarm");
    res.status(201).json({
      message: "Raised an Alert for patient",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

exports.consumeBP = async (req, res) => {
  try {
    const { consume_id, mac_addr, seconds } = req.body;
    var data = { type: "bp", device: mac_addr, vital_data: [] };

    amqp.connect("amqp://localhost", function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        var exchange = "blood_pressure";
        var key = mac_addr;

        channel.assertExchange(exchange, "topic", {
          durable: false,
        });

        channel.assertQueue(
          "",
          {
            exclusive: true,
          },
          function (error2, q) {
            if (error2) {
              throw error2;
            }
            console.log(
              " [*] Waiting for BP , Pulse logs. To exit press CTRL+C"
            );

            channel.bindQueue(q.queue, exchange, key);

            channel.consume(
              q.queue,
              function (msg) {
                data.vital_data.push(JSON.parse(msg.content.toString()));
              },
              {
                noAck: true,
              }
            );

            setTimeout(function () {
              Calc_CriticalScores_and_NormaliseValues_BP(
                data.vital_data,
                consume_id
              )
                .then((resolved_data) => {
                  console.log(resolved_data);
                })
                .catch((err) => {
                  console.log(err);
                });
              channel.close();
              connection.close();
            }, seconds * 1000);
          }
        );
      });
    });

    res.send(`Consuming the topic you have sent wait for ${seconds} seconds`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

exports.consumeTemp = async (req, res) => {
  try {
    const { consume_id, mac_addr, seconds } = req.body;
    var data = { type: "temperature", device: mac_addr, vital_data: [] };

    amqp.connect("amqp://localhost", function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        var exchange = "temperature";
        var key = mac_addr;

        channel.assertExchange(exchange, "topic", {
          durable: false,
        });

        channel.assertQueue(
          "",
          {
            exclusive: true,
          },
          function (error2, q) {
            if (error2) {
              throw error2;
            }
            console.log(
              " [*] Waiting for Temperature  logs. To exit press CTRL+C"
            );

            channel.bindQueue(q.queue, exchange, key);

            channel.consume(
              q.queue,
              function (msg) {
                data.vital_data.push(JSON.parse(msg.content.toString()));
              },
              {
                noAck: true,
              }
            );

            setTimeout(function () {
              Calc_CriticalScores_and_NormaliseValues_Temp(
                data.vital_data,
                consume_id
              )
                .then((resolved_data) => {
                  console.log(resolved_data);
                })
                .catch((err) => {
                  console.log(err);
                });
              channel.close();
              connection.close();
            }, seconds * 1000);
          }
        );
      });
    });

    res.send(`Consuming the topic you have sent wait for ${seconds} seconds`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

exports.calcCriticalScores = async (req, res) => {
  try {
    const { consume_id } = req.body;

    const consume_row = await pool.query(
      "Select * from consumer where consumer_id=$1",
      [consume_id]
    );

    const patient = await pool.query(
      "Select * from patient where patient_id=$1",
      [consume_row.rows[0].id]
    );

    const bp_vital_data = await pool.query(
      "Select * from vital_bp_sensor where vbp_id=$1",
      [consume_row.rows[0].vbp_id]
    );

    const temp_vital_data = await pool.query(
      "Select * form vital_temperature_sensor where vtemp_id=$1",
      [consume_row.rows[0].vtemp_id]
    );

    return res.status(200).json({
      patient,
      bp_vital_data,
      temp_vital_data,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};

var Calc_CriticalScores_and_NormaliseValues_BP = async (data, consume_id) => {
  return new Promise(function (resolve, reject) {
    try {
      var sys = [];
      var dia = [];
      var hr = [];
      data.forEach((vital) => {
        sys.push(vital.systolic_blood_pressure);
        dia.push(vital.diastolic_blood_pressure);
        hr.push(vital.pulse);
      });
      // Finding Mean Values for Vital Data
      var sys_mean = math.mean(sys);
      var dia_mean = math.mean(dia);
      var hr_mean = math.mean(hr);

      // Finding Standard Deviation Values for Vital Data
      var sys_dev = math.std(sys);
      var dia_dev = math.std(dia);
      var hr_dev = math.std(hr);

      if (sys_dev > 10 || dia_dev > 10 || hr_dev > 10) {
        resolve({
          error:
            "Oops Like like there is problem with readings and there is a lot of deviation, Please try again",
        });
      }

      // Finding Min and MaxValues for Vital Data
      var sys_min = math.min(sys);
      var dia_min = math.min(dia);
      var hr_min = math.min(hr);

      var sys_max = math.max(sys);
      var dia_max = math.max(dia);
      var hr_max = math.max(hr);

      // Writing Values into Vital Database Tables for Pulse and BP

      const retured_values = await pool.query(
        "Insert into vital_bp_sensor(systolic_min_bp,systolic_max_bp,systolic_avg_bp, systolic_sd_bp,diastolic_min_bp, diastolic_max_bp, diastolic_avg_bp, diastolic_sd_bp, heartrate_min, heartrate_max,heartrate_avg, heartrate_sd,timestamp) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning  vbp_id",
        [
          parseInt(sys_min),
          parseInt(sys_max),
          parseInt(sys_mean),
          parseInt(sys_dev),
          parseInt(dia_min),
          parseInt(dia_max),
          parseInt(dia_mean),
          parseInt(dia_dev),
          parseInt(hr_min),
          parseInt(hr_max),
          parseInt(hr_mean),
          parseInt(hr_dev),
          Date.now(),
        ]
      );

      await pool.query(
        "Update consumer set vbp_id = $1 where consumer_id = $2 ",
        [retured_values.rows[0].vbp_id, consume_id]
      );

      const sys_normal_values = {
        sys_min: sys_min,
        sys_max: sys_max,
        sys_dev: sys_dev,
        sys_mean: sys_mean,
      };

      const dia_normal_values = {
        dia_min: dia_min,
        dia_max: dia_max,
        dia_dev: dia_dev,
        dia_mean: dia_mean,
      };

      const hr_normal_values = {
        hr_min: hr_min,
        hr_max: hr_max,
        hr_dev: hr_dev,
        hr_mean: hr_mean,
      };

      const result = {
        values: {
          systolic_blood_pressure: sys,
          diastolic_blood_pressure: dia,
          Pulse: hr,
        },
        normal_values: {
          systolic_normal_values: sys_normal_values,
          diastolic_normal_values: dia_normal_values,
          pulse_normal_values: hr_normal_values,
        },
      };
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

var Calc_CriticalScores_and_NormaliseValues_Temp = async (data, consume_id) => {
  return new Promise(function (resolve, reject) {
    try {
      var temp = [];
      data.forEach((vital) => {
        temp.push(vital.temperature);
      });

      // Finding Min, Max , Mean and Standard Deviation values for Temperature
      const temp_min = math.min(temp);
      const temp_max = math.max(temp);
      const temp_dev = math.std(temp);
      const temp_mean = math.mean(temp);

      if (temp_dev > 5) {
        resolve({
          error:
            "Please try to collect data again , there is lot of deviation in values. There might be some error while collecting",
        });
      }

      const retured_values = await pool.query(
        "insert into vital_temperature_sensor(temp_min,temp_max, temp_avg, temp_sd,timestamp) values($1,$2,$3,$4,$5) returning vtemp_id",
        [temp_min, temp_max, temp_mean, temp_dev, Date.now()]
      );

      await pool.query(
        "Update consumer set vtemp_id = $1 where consumer_id = $2 ",
        [retured_values.rows[0].vtemp_id, consume_id]
      );

      const temp_normal_values = {
        temperature_min: temp_min,
        temperature_max: temp_max,
        temperature_mean: temp_mean,
        temperature_dev: temp_dev,
      };

      const result = {
        values: {
          temperature: temp,
        },
        normal_values: temp_normal_values,
      };
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
