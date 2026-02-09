import './globals.css';

export const metadata = {
  title: 'Photobooth',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
