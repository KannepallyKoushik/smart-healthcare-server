const enivironment = require("dotenv").config;
const pool = require("../db");
var amqp = require("amqplib/callback_api");

exports.consumeData = async (req, res) => {
  try {
    const { topic, id, routing_key, seconds } = req.body;

    consumer(topic, routing_key, seconds, id);

    res.send("Consuming the topic you have sent");
  } catch (error) {
    console.error(error);
  }
};

function consumer(topic, routing_key, seconds, id) {
  var data = { type: topic, user: id, vital_data: [] };

  amqp.connect("amqp://localhost", function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = topic;
      var key = routing_key;

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
              // console.log(
              //   " [x] %s:'%s'",
              //   msg.fields.routingKey,
              //   msg.content.toString()
              // );
              data.vital_data.push(msg.content.toString());
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
}
