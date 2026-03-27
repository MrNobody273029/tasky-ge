

import { Suspense } from 'react';
import ProofsClient from './ProofsClient';

export default function Page(props: any) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProofsClient {...props} />
    </Suspense>
  );
}