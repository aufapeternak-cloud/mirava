import 'bootstrap/dist/css/bootstrap.min.css';
import '../public/custom.css';
import SessionMonitor from '../components/SessionMonitor';

export const metadata = {
  title: 'Video Generator Pro',
  description: 'Professional video generation platform with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-bs-theme="dark">
      <body>
        {children}
        <SessionMonitor />
      </body>
    </html>
  );
}
