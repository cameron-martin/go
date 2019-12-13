import { useAuth } from './auth/AuthProvider';
import React from 'react';
import { ApiClient } from '../api-client';
import Puzzle from './Puzzle';

interface Props {
  apiClient: ApiClient;
}

export default function Homepage({ apiClient }: Props) {
  const isLoggedIn = useAuth();

  if (isLoggedIn) {
    return <Puzzle apiClient={apiClient} />;
  } else {
    return <div>You must be logged in to use the app</div>;
  }
}
