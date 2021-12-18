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
              // console.log(data);
              Calc_CriticalScores_and_NormaliseValues_BP(data.vital_data).then(
                (resolved_data) => {
                  console.log(resolved_data);
                }
              );
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
              // console.log(data);
              Calc_CriticalScores_and_NormaliseValues_Temp(
                data.vital_data
              ).then((resolved_data) => {
                console.log(resolved_data);
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
  }
};

var Calc_CriticalScores_and_NormaliseValues_BP = (data) => {
  return new Promise(function (resolve, reject) {
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

    // Finding Min and MaxValues for Vital Data
    var sys_min = math.min(sys);
    var dia_min = math.min(dia);
    var hr_min = math.min(hr);

    var sys_max = math.max(sys);
    var dia_max = math.max(dia);
    var hr_max = math.max(hr);

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
  });
};

var Calc_CriticalScores_and_NormaliseValues_Temp = (data) => {
  return new Promise(function (resolve, reject) {
    var temp = [];
    data.forEach((vital) => {
      temp.push(vital.temperature);
    });

    // Finding Min, Max , Mean and Standard Deviation values for Temperature
    const temp_min = math.min(temp);
    const temp_max = math.max(temp);
    const temp_dev = math.std(temp);
    const temp_mean = math.mean(temp);

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
  });
};
