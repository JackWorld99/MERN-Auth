const validator = require('validator')
const { CustomError } = require('../middleware/errorHandler')

const options = { host_whitelist: ['gmail.com', 'yahoo.com', 'outlook.com'] }

const validateAuthInput = (fieldName, value) => {
    if (validator.isEmpty(value ?? '', { ignore_whitespace: true })) throw new CustomError(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`, 400)

    if (fieldName.toLowerCase() === 'email' && !validator.isEmail(value, options)) throw new CustomError('Email not valid', 400)

    if (fieldName.toLowerCase() === 'password' && !validator.isStrongPassword(value)) throw new CustomError('Password not strong enough', 400)
}
  
const validateAuthInputField = (fields) => {
    Object.entries(fields).forEach(([key, value]) => {
        validateAuthInput(key, value)
    })
}

module.exports = { validateAuthInputField }