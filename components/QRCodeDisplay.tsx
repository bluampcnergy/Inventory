import React from 'react';

interface QRCodeDisplayProps {
  value: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value }) => {
  // The qrcode.react UMD script exposes a 'QRCode' global variable on the window object.
  // We must access it via `window` inside the component's render function to ensure the script has loaded.
  const QRCodeComponent = (window as any)?.QRCode?.QRCodeSVG;

  // Check if the QRCode component was successfully loaded from the global script.
  if (!QRCodeComponent) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-lg flex items-center justify-center" role="alert">
        <p>Error: QR Code component could not be loaded. Please ensure you are connected to the internet and refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg flex flex-col items-center">
       {/* Render the QR code using the component loaded from the window object */}
       <QRCodeComponent value={value} size={256} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} />
      <span className="mt-4 text-xs font-mono break-all bg-white px-2 py-1 rounded">{value}</span>
    </div>
  );
};

export default QRCodeDisplay;
