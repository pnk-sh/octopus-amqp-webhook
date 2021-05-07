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

      logger.debug(`[x] Received ${json_data}`);

      const deploy_queue = process.env.AMQP_QUEUE_DEPLOYMENT;

      axios.get(`${process.env.REST_API_HOST}service`, {
        params: {
          autodeploy: 1,
          identifier: json_data.identifier,
          tag: json_data.tag
        }
      }).then((resp) => {
        const service_count = resp.data.services.length

        if (service_count > 0) {
          logger.info(`${service_count} service found with identifier: ${json_data.identifier} and tag:${json_data.tag}`)

          axios.post(`${process.env.REST_API_HOST}webhook/${json_data.id}`, {
            status: 'processing',
            service_update_pending: service_count
          })

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
              logger.debug(`[x] Sent ${deploy_msg}`)

              let utctime = (new Date()).toISOString();
              utctime = utctime.replace('T', ' ')
              utctime = utctime.replace('Z', '000')

              axios.post(`${process.env.REST_API_HOST}logging`, {
                summary: 'Sending service deploy to AMQP',
                description: `Prepare deployment for ${service_data.Image}/${json_data.tag} on service-id ${service_data.ID}`,
                created_at: utctime,
                binds: [
                  `service_id-${service_data.ID}`,
                  `webhook_id-${json_data.id}`,
                  `webhook_identifier-${json_data.identifier}`,
                  `image_name-${service_data.Image}`,
                  `image_tag-${json_data.tag}`,
                ],
              })
            }
          });
        } else {
          logger.info(`No service found with identifier:${json_data.identifier} and tag:${json_data.tag}`)
          axios.post(`${process.env.REST_API_HOST}webhook/${json_data.id}`, {
            status: 'cancel',
          })
        }
      })
    }, {
      noAck: true
    });
  });
});