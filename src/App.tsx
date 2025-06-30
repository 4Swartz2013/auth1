import React from 'react';
import AuthenticationWrapper from './components/AuthenticationWrapper';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <AuthenticationWrapper />
      <Toaster position="top-right" />
    </>
  );
}

export default App;