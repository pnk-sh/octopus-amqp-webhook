# Octopus AMQP Webhook
Handle queue message landing into the webhook queue in RabbitMQ

## AMQP Sample message
``` json 
{
    "id": "608f26a6d5a061203f7a1c9c",
    "identifier": "my-custom-identifier",
    "image": "sample/image-test",
    "tag": "beta"
}
```

## Docker Service Labels
A way to actived autodeployment for you Docker Swarm Cluster. Its required to add labels on every single service before Docker Octopus will be triggered and deploy new images out.

| Labels  | default | options |
|---|---|---|
| webhook_autodeploy | 0 |  1 = autodeploy, 0 = disabled |
| webhook_identifier |  | custom created identifier |
| webhook_tag | | image tag |
