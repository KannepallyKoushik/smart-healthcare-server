const enivironment = require("dotenv").config;
const math = require("mathjs");
const pool = require("../db");
var amqp = require("amqplib/callback_api");

exports.consumeData = async (req, res) => {
  try {
    const { patient_id } = req.body;
    const d = new Date();
    const date = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const date_of_diagnosis = date + "-" + month + "-" + year;

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
    console.error(error.message);
    res.status(500).send("Server Error");
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
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.reviewData = async (req, res) => {
  try {
    const { consume_id } = req.body;

    const consume_row = await pool.query(
      "Select * from consumer where consumer_id=$1",
      [consume_id]
    );

    const patient = await pool.query(
      "Select name,age,sex,thyroid,prevalentstroke,diabetes from patient where id=$1",
      [consume_row.rows[0].id]
    );

    const manualThyroid_Diabetes_Data = await pool.query(
      "Select sugar_post_lunch, sugar_pre_lunch,t3_harmone_value ,t4_harmone_value,tsh_value from thyroid_diabetes where td_id= $1",
      [consume_row.rows[0].td_id]
    );

    const bp_vital_data = await pool.query(
      "Select * from vital_bp_sensor where vbp_id=$1",
      [consume_row.rows[0].vbp_id]
    );

    const temp_vital_data = await pool.query(
      "Select * from vital_temperature_sensor where vtemp_id=$1",
      [consume_row.rows[0].vtemp_id]
    );

    var bp = {};
    var pulse = {};
    var tempValues = {};

    if (bp_vital_data.rowCount == 0) {
      bp = {
        systolic_bp_mean: "NA",
        systolic_collected_variation: "NA",
        diastolic_bp_mean: "NA",
        diastolic_collected_variation: "NA",
      };
      pulse = {
        pulse_mean: "NA",
        pulse_collected_variation: "NA",
      };
    } else {
      bp = {
        systolic_bp_mean: bp_vital_data.rows[0].systolic_avg_bp,
        systolic_collected_variation: bp_vital_data.rows[0].systolic_sd_bp,
        diastolic_bp_mean: bp_vital_data.rows[0].diastolic_avg_bp,
        diastolic_collected_variation: bp_vital_data.rows[0].diastolic_sd_bp,
      };
      pulse = {
        pulse_mean: bp_vital_data.rows[0].heartrate_avg,
        pulse_collected_variation: bp_vital_data.rows[0].heartrate_sd,
      };
    }

    if (temp_vital_data.rowCount == 0) {
      tempValues = {
        mean_body_temperature: "NA",
        variance_body_temperature: "NA",
      };
    } else {
      tempValues = {
        mean_body_temperature: temp_vital_data.rows[0].temp_avg,
        variance_body_temperature: temp_vital_data.rows[0].temp_sd,
      };
    }

    var result = {
      patientDetails: patient.rows[0],
      Sugar_Thyroid_Levels: manualThyroid_Diabetes_Data.rows[0],
      blood_pressure_data: bp,
      pulse_data: pulse,
      body_temperature_data: tempValues,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.calcCriticalScores = async (req, res) => {
  try {
    const {
      patientDetails,
      Sugar_Thyroid_Levels,
      blood_pressure_data,
      pulse_data,
      body_temperature_data,
    } = req.body;

    const abnormalityScore = criticalAbnormalityScore(
      patientDetails,
      Sugar_Thyroid_Levels
    );
    const BP_Abnormality = calculateAbnormalityBP(
      patientDetails,
      blood_pressure_data
    );
    const pulseAbnormality = calculateAbnormalityPulse(
      patientDetails,
      pulse_data
    );
    const temperatureAbnormality = calculateAbnormalityTemperature(
      patientDetails,
      body_temperature_data
    );

    var condition = "";
    if (abnormalityScore >= 5) {
      condition = "critical condition";
    } else if (abnormalityScore > 2 && abnormalityScore <= 4) {
      condition = "moderate condition";
    } else if (abnormalityScore <= 2) {
      condition = "mild condition";
    }

    const result = {
      Patient_Condition: condition,
      Abnormalities: [],
    };

    // BP_Abnormality != null
    //   ? result.Abnormalities.push(BP_Abnormality)
    //   : console.log("No abnormality in BP found");
    // pulseAbnormality != null
    //   ? result.Abnormalities.push(pulseAbnormality)
    //   : console.log("No abnormality in Pulse found");
    // temperatureAbnormality != null
    //   ? result.Abnormalities.push(temperatureAbnormality)
    //   : console.log("No abnormality in Temperature found");
    console.log(BP_Abnormality, pulseAbnormality, temperatureAbnormality);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

function criticalAbnormalityScore(patientDetails, Sugar_Thyroid_Levels) {
  var { age, diabetes, prevalentstroke } = patientDetails;
  const {
    sugar_post_lunch,
    sugar_pre_lunch,
    t3_harmone_value,
    t4_harmone_value,
    tsh_value,
  } = Sugar_Thyroid_Levels;

  var thyroidPresence = false;
  var thyroidScore = 3;
  if (parseFloat(tsh_value) > 0.5 && parseFloat(tsh_value) < 4.5)
    thyroidScore -= 1;
  if (parseFloat(t3_harmone_value) > 80 && parseFloat(t3_harmone_value) < 220)
    thyroidScore -= 1;
  if (
    parseFloat(t4_harmone_value) >= 5.4 &&
    parseFloat(t4_harmone_value) <= 11.5
  )
    thyroidScore -= 1;

  if (thyroidScore >= 2) thyroidPresence = true;

  var diabetesPresence = true;
  if (
    parseFloat(sugar_pre_lunch) >= 70 &&
    parseFloat(sugar_pre_lunch) <= 100 &&
    parseFloat(sugar_post_lunch) < 140 &&
    diabetes != "Yes"
  ) {
    diabetesPresence = false;
  }

  if (
    parseFloat(sugar_pre_lunch) >= 101 &&
    parseFloat(sugar_pre_lunch) <= 126 &&
    parseFloat(sugar_post_lunch) >= 140 &&
    parseFloat(sugar_post_lunch) < 200 &&
    diabetes == "Yes"
  ) {
    diabetesPresence = false;
  }
  age = parseFloat(age);

  var scoring = 0;
  if (age > 17 && age < 38) {
    diabetesPresence ? (scoring += 3) : (scoring += 0);
    thyroidPresence ? (scoring += 2) : (scoring += 0);
    prevalentstroke ? (scoring += 3) : (scoring += 0);
  } else if (age > 37 && age < 60) {
    diabetesPresence ? (scoring += 2) : (scoring += 0);
    thyroidPresence ? (scoring += 2) : (scoring += 0);
    prevalentstroke ? (scoring += 2) : (scoring += 0);
    diabetesPresence && thyroidPresence && prevalentstroke
      ? (scoring = 8)
      : (scoring += 0);
  } else if (age > 59) {
    diabetesPresence ? (scoring += 1) : (scoring += 0);
    thyroidPresence ? (scoring += 1) : (scoring += 0);
    prevalentstroke ? (scoring += 1) : (scoring += 0);
    diabetesPresence && thyroidPresence && prevalentstroke
      ? (scoring = 6)
      : (scoring += 0);
  }
  return scoring;
}

function calculateAbnormalityBP(patientDetails, blood_pressure_data) {
  var { age } = patientDetails;
  var { systolic_bp_mean, diastolic_bp_mean } = blood_pressure_data;
  age = parseInt(age);
  systolic_bp_mean = parseFloat(systolic_bp_mean);
  diastolic_bp_mean = parseFloat(diastolic_bp_mean);

  var abnormality = null;

  if (age > 17 && age < 36) {
    systolic_bp_mean > 150 || diastolic_bp_mean > 100
      ? (abnormality = "Hypertension")
      : (abnormality = null);
    systolic_bp_mean < 82
      ? (abnormality = "Hypotension")
      : (abnormality = null);
  } else if (age > 35 && age < 61) {
    systolic_bp_mean > 145 || diastolic_bp_mean > 95
      ? (abnormality = "Hypertension")
      : (abnormality = null);
    systolic_bp_mean < 95
      ? (abnormality = "Hypotension")
      : (abnormality = null);
  } else if (age > 60) {
    systolic_bp_mean > 140 || diastolic_bp_mean > 90
      ? (abnormality = "Hypertension")
      : (abnormality = null);
    systolic_bp_mean < 117
      ? (abnormality = "Hypotension")
      : (abnormality = null);
  }
}

function calculateAbnormalityPulse(patientDetails, pulse_data) {
  var { age } = patientDetails;
  var { pulse_mean } = pulse_data;
  age = parseInt(age);

  var abnormality = null;

  if (age > 17 && age < 36) {
    pulse_mean <= 55 ? (abnormality = "Bradycardia") : (abnormality = null);
    pulse_mean >= 110 ? (abnormality = "Tachycardia") : (abnormality = null);
  } else if (age > 35 && age < 61) {
    pulse_mean <= 60 ? (abnormality = "Bradycardia") : (abnormality = null);
    pulse_mean >= 120 ? (abnormality = "Tachycardia") : (abnormality = null);
  } else if (age > 60) {
    pulse_mean <= 65 ? (abnormality = "Bradycardia") : (abnormality = null);
    pulse_mean >= 100 ? (abnormality = "Tachycardia") : (abnormality = null);
  }
}

function calculateAbnormalityTemperature(
  patientDetails,
  body_temperature_data
) {
  var abnormality = null;
  var { age } = patientDetails;
  var { mean_body_temperature } = body_temperature_data;
  if (parseInt(age) > 17) {
    parseFloat(mean_body_temperature) < 35.5
      ? (abnormality = "Hypothermia")
      : (abnormality = null);
    parseFloat(mean_body_temperature) > 37.1
      ? (abnormality = "Fever")
      : (abnormality = null);
  }
  return abnormality;
}

var Calc_CriticalScores_and_NormaliseValues_BP = async (data, consume_id) => {
  return new Promise(async (resolve, reject) => {
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
          parseFloat(sys_min),
          parseFloat(sys_max),
          parseFloat(sys_mean),
          parseFloat(sys_dev),
          parseFloat(dia_min),
          parseFloat(dia_max),
          parseFloat(dia_mean),
          parseFloat(dia_dev),
          parseFloat(hr_min),
          parseFloat(hr_max),
          parseFloat(hr_mean),
          parseFloat(hr_dev),
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
  return new Promise(async (resolve, reject) => {
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
