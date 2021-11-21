import React, { useRef, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

const canvasSize = 512;

const Dropzone = ({ message, onFileChange }) => {
  const canvas = useRef(null);
  const [showCanvas, setShowCanvas] = useState(false);

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    maxSize: 20000000,
    accept: "image/jpeg, image/png",
  });

  const file = acceptedFiles?.[0];

  const reader = new FileReader();
  reader.onloadend = (event) => {
    setShowCanvas(true);
    const ctx = canvas.current.getContext("2d");

    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
      onFileChange(canvas.current.toDataURL());
    };
  };

  useEffect(() => {
    if (file) {
      reader.readAsDataURL(file);
    }
    return () => onFileChange(null);
  }, [file, onFileChange]);

  return (
    <div>
      <div
        {...getRootProps({
          className:
            "dropzone animate__animated animate__bounceInUp nes-container is-rounded",
        })}
      >
        <input {...getInputProps()} />
        <p>{message}</p>
      </div>

      {showCanvas && (
        <div className="preview">
          <canvas ref={canvas} width={512} height={512} />
        </div>
      )}
    </div>
  );
};

export default Dropzone;
