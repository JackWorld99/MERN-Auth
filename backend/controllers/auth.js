const User = require('../models/User')
const jwt = require('jsonwebtoken')

const createRefreshToken = (_id) => jwt.sign({_id}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

exports.login = async (req, res) => {
  const {email, password} = req.body

  try {
    const user = await User.login(email, password)
    const accessToken = jwt.sign({_id: user._id}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
    const refreshToken = createRefreshToken(user._id)
    res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.status(200).json({name: user.name, email, accessToken})
  } catch (error) {
    res.status(400).json({error: error.message})
  }
}

exports.signup = async (req, res) => {
  const {name, email, password} = req.body

  try {
    const user = await User.signup(name, email, password)
    const accessToken = jwt.sign({_id: user._id}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
    const refreshToken = createRefreshToken(user._id)
    res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.status(200).json({name: user.name, email, accessToken})
  } catch (error) {
    res.status(400).json({error: error.message})
  }
}

exports.refresh = (req, res) => {
  const cookies = req.cookies

  if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' })

  const refreshToken = cookies.jwt

  jwt.verify(
    refreshToken, 
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Forbidden' })

      const foundUser = await User.findOne({ _id: decoded._id }).exec()
      
      if (!foundUser) return res.status(401).json({ error: 'Unauthorized' })

      const accessToken = jwt.sign({_id: foundUser._id}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1m' })

      res.json({ name: foundUser.name, email: foundUser.email, accessToken })
    }
  )
}

exports.logout = async (req, res) => {
  const token = req.cookies.jwt
  if (!token) return res.sendStatus(204)
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'Lax', secure: true })
  res.json({ error: 'Cookie cleared' })
}