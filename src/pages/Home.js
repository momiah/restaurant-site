import React, { useEffect } from 'react';
import Menu from '../components/Menu/Menu';
import toast from 'react-hot-toast';

const Home = () => {
  // get "success" param from URL
  const success = new URLSearchParams(window.location.search).get('success');

  useEffect(() => {
    success === 'true' && toast.success('Payment successful!', { duration: 5000 });
    success === 'false' && toast.error('Payment failed!', { duration: 5000 });
  }, [success])
  

  return (

<div>
<Menu/>
</div>
 
  )
};

export default Home;