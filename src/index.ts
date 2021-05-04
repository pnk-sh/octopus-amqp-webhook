import amqp from 'amqplib/callback_api';
import axios from 'axios';

import logger from "./models/logger";

require('dotenv').config()

amqp.connect(`${process.env.AMQP_HOST}`, function(error0: any, connection: any) {
  if (error0) {
    throw error0;
  }
  
  connection.createChannel((error1: any, channel: any) => {
    if (error1) {
      throw error1;
    }

    const queue = process.env.AMQP_QUEUE_WEBHOOK;

    channel.assertQueue(queue, {
      durable: false
    });

    logger.info(" [*] Waiting for messages in %s.", queue);

    channel.consume(queue, (msg: any) => {
      const json_data = JSON.parse(msg.content.toString());

      logger.info(" [x] Received %s", json_data);

      const deploy_queue = process.env.AMQP_QUEUE_DEPLOYMENT;

      axios.get(`${process.env.REST_API_HOST}service`, {
        params: {
          autodeploy: 1,
          identifier: json_data.identifier,
          tag: json_data.tag
        }
      }).then((resp) => {
        
        resp.data.services.forEach((service_data: any) => {
          const cluster_id = service_data.ClusterID;

          if (cluster_id) {
            channel.assertQueue(`${deploy_queue}-${cluster_id}`, {
              durable: false
            });
            
            const deploy_msg = JSON.stringify({
              "cluster_id": cluster_id,
              "service_id": service_data.ID,
              "image": service_data.Image,
              "tag": json_data.tag
            });

            channel.sendToQueue(`${deploy_queue}-${cluster_id}`, Buffer.from(deploy_msg));
            console.log(" [x] Sent %s", deploy_msg);
          }
        });        
      })

    }, {
      noAck: true
    });
  });
});