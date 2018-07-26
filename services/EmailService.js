var EmailService = {

    verifyEmail : verifyEmail

};

module.exports = EmailService;

function verifyEmail(email) {
    console.log('Verifying email of '+ email);

    return new Promise(function(resolve, reject) {
        if (!email || email.length === 0) return reject(new Error('You must provide an email address.'));

        if (email.length > 50) return reject(new Error('Email length cannot exceed 50 characters.'));

        // Needs one @ symbol
        if ((email.match(/@/g) || []).length !== 1) return reject(new Error('Email must contain one @ symbol.'));

        // Needs a period
        if ((email.match(/\./g) || []).length < 1) return reject(new Error('Email must contain at least one period.'));

        return resolve(email);
    });
}