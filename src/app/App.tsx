import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

export function App(): ReactElement {
  return (
    <div>
      <header>dx-doc</header>
      <main>
        <Routes>
          <Route path="/" element={<p>R0 scaffolding — the tracking documentation platform.</p>} />
        </Routes>
      </main>
    </div>
  );
}
