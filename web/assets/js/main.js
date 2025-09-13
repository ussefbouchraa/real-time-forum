const socket = new WebSocket("ws://localhost:8080/ws");
const sessionID = localStorage.getItem("sessionID");
if (sessionID != null) {
    socket.send(JSON.stringify({
        type: "user_have_session",
        sessionID: sessionID,
    }));
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case "new_post":
            // DOM update here
            break;
        case "register_response":
            // DOM update here
            if (data.status === "ok") {
                // DOM update : show login page
            }
            break;
        case "session_response":
        case "login_response":

            if (data.status === "ok") {
                localStorage.setItem("sessionID", data.sessionID);
                // DOM update here -> show main page
            }
            break;
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
