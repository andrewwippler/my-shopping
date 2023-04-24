import React, { useState } from 'react'
import useUser from '@/lib/useUser'
import Layout from '@/components/Layout'
import Form from '@/components/Form'
import fetchJson, { FetchError } from '@/lib/fetchJson'
import { useAppDispatch, useAppSelector } from '@/hooks'
export default function Login() {

  const dispatch = useAppDispatch()

  // retrieve first accessed path as unauthenticated user
  const { mutateUser } = useUser({
    redirectIfFound: true,
  })

  const [errorMsg, setErrorMsg] = useState('')

  return (
    <Layout>
      <div className="login">
        <Form
          errorMessage={errorMsg}
          onSubmit={async function handleSubmit(event) {
            event.preventDefault()

            const body = {
              email: event.currentTarget.email.value,
              password: event.currentTarget.password.value,
            }

            try {
              mutateUser(
                await fetchJson('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })
              )
            } catch (error) {
              if (error instanceof FetchError) {
                setErrorMsg(error.data.message)
              } else {
                console.error('An unexpected error happened:', error)
              }
            }
          }}
        />
      </div>

    </Layout>
  )
}
