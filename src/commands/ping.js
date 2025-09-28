export default {
    name: 'ping',
    description: 'Ping!',
    execute: (i) => {
        i.createMessage('Pong.');
    },
};