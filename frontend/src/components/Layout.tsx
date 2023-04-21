import Head from 'next/head'
import Header from '@/components/Header'
import { format } from 'date-fns'
import Link from 'next/link'

export default function Layout({ children }: { children: React.ReactNode }) {

  return (
    <>
      <Head>
        <title>Shopping</title>
      </Head>

      <Header />
      <main className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-screen-lg">{children}</div>
      </main>
      <footer className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-screen-lg text-sky-500">
          Shopping &copy; Copyright 2022-{format(new Date(),'yyyy')} Andrew Wippler
      </div>
    </footer>
    </>
  )
}
