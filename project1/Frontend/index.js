const loginForm = document.querySelector('#user-sign-in');
const registerBtn = document.querySelector('#register-button');
const errorMsg = document.querySelector('#error-message');

function clearError() {
    if (errorMsg) errorMsg.textContent = '';
}

function showError(msg) {
    if (errorMsg) errorMsg.textContent = msg;
}

// Sign In via form submit event (triggers native pattern checks)
loginForm.onsubmit = async function(e) 
{
    e.preventDefault(); clearError();

    const username = document.querySelector('#username-input').value.trim();
    const password = document.querySelector('#password-input').value.trim();

    try {
        const response = await fetch('http://localhost:5050/update/Users/signIn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resData = await response.json();

        // Transition into the tableContents.html!
        if (response.ok && resData.success) 
        {
            sessionStorage.setItem('loggedInUser', resData.data.username); // Can use session storage to get the data, the token begin used is better though
            sessionStorage.setItem('sessionToken', resData.token);
            window.location.href = 'tableContents.html'; // with session storage, we don't need to pass data!
        } 
        else { showError(resData.error || 'Invalid credentials. Check username and password.'); }
    } 
    catch (err) { console.error('Sign In Error:', err); showError('Unable to connect to server.'); }
};

// Register Handler (explicit checkValidity call, as well as it not being a form submit)
registerBtn.onclick = async function() 
{
    clearError();

    if (!loginForm.checkValidity()) // The checkValidity() method of the HTMLFormElement interface returns a boolean value which indicates if all associated controls meet any constraint validation rules applied to them.
    {
        loginForm.reportValidity(); // Triggers browser tooltip showing illegal characters; The reportValidity() method of the HTMLFormElement interface performs the same validity checking steps as the checkValidity() method.
        return;
    }

    const username = document.querySelector('#username-input').value.trim();
    const password = document.querySelector('#password-input').value.trim();

    try {
        const response = await fetch('http://localhost:5050/insert/Users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resData = await response.json();

        if (response.ok && resData.success) {
            sessionStorage.setItem('loggedInUser', resData.data.username); // Wouldn't use this as much as the token
            sessionStorage.setItem('sessionToken', resData.token);
            window.location.href = 'tableContents.html';
        } else {
            showError(resData.error || 'Registration failed.');
        }
    } 
    catch (err) { console.error('Registration Error:', err); showError('Unable to connect to server.'); }
};