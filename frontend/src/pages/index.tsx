import Layout from '@/components/Layout'
import ShoppingList from '@/components/ShoppingList';
import useUser from '@/lib/useUser';

export default function Home() {
  const { user } = useUser({
    redirectTo: '/login',
  })

  return (
    <Layout>
      { user?.isLoggedIn && (<ShoppingList />) }
    </Layout>
  )
}
