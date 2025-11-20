// app/page.tsx
import {redirect} from 'next/navigation';

export default function Root() {
  redirect('/ka'); // დეფოლტად ქართულ ვერსიაზე გადადის
}
