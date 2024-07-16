var socket = new WebSocket('ws://dancecam1.local:8765');

// Connection opened
socket.addEventListener('open', (event) => {
    console.log('WebSocket connection established');
    // Request the list of available models
    const message = JSON.stringify({ type: 'request-models' });
    socket.send(message);
});

socket.send(JSON.stringify({ type: "watch-poses" }));

// Listen for messages
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'models') {
        console.log('Available models:', data.models);
        // Here you can update the UI or perform other actions with the models list
    } else if (data.type === 'error') {
        console.error('Error:', data.message);
    } else {
      console.log(data); 
    }
});

// Connection closed
socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed');
});

// Handle errors
socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});
