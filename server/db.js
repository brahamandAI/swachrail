import mongoose from 'mongoose'
import { fail } from './http.js'

let connecting = null

export function connectDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    fail(503, 'Database is not configured. Set MONGODB_URI on the server.')
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection)
  if (!connecting) {
    mongoose.set('strictQuery', true)
    connecting = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).catch((err) => {
      connecting = null
      throw err
    })
  }
  return connecting
}
