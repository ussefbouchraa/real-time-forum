const socket = new WebSocket("ws://localhost:8080/ws");

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) { // `data` is an object (the initial attributes are: => type and data) we use data.type to distinguish between new updates from the server (other clients) and we want to show that in the index.html using dom 
        case "new_post":
            // DOM update here
            break;
        case "register_response":
        // DOM update here
        // or :
        if(data.status === "ok") alert("Registration successful");
        else alert("Error: " + data.error);
    }
}

document.getElementById("registerBtn").addEventListener("click", () => {
    const userData = {
        type: "register",
        data: {
            first_name: document.getElementById("first_name").value,
            last_name: document.getElementById("last_name").value,
            nickname: document.getElementById("nickname").value,
            age: document.getElementById("age").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        }
    }
    socket.send(JSON.stringify(userData))
})
