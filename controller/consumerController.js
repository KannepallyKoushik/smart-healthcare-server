const enivironment = require("dotenv").config;
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
    var data = { type: "bp", vital_data: [] };

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
            console.log(" [*] Waiting for logs. To exit press CTRL+C");

            channel.bindQueue(q.queue, exchange, key);

            channel.consume(
              q.queue,
              function (msg) {
                data.vital_data.push(msg.content.toJSON());
              },
              {
                noAck: true,
              }
            );

            setTimeout(function () {
              console.log(data);
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
    var data = { type: "temperature", vital_data: [] };

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
            console.log(" [*] Waiting for logs. To exit press CTRL+C");

            channel.bindQueue(q.queue, exchange, key);

            channel.consume(
              q.queue,
              function (msg) {
                data.vital_data.push(msg.content.toJSON());
              },
              {
                noAck: true,
              }
            );

            setTimeout(function () {
              console.log(data);
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
