import React from 'react';
import MapEditor from './components/MapEditor';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-gray-900 text-white overflow-hidden">
      <MapEditor />
    </div>
  );
};

export default App;

