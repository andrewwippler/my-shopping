import type { User } from './user'
import { withIronSessionApiRoute } from 'iron-session/next'
import { sessionOptions } from '@/lib/session'
import { NextApiRequest, NextApiResponse } from 'next'

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = await req.body

  try {
    const response = await fetch(`${process.env.AUTH_SERVER}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const result = await response.json()
    if (result.message) {
      res.status(500).json(result)
    }

    const user = { isLoggedIn: true, token: result.token, uid: result.uid } as User
    req.session.user = user
    await req.session.save()
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: (error as Error).message })
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions)
