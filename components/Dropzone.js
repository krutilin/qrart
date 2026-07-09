import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

const canvasSize = 512;

const Dropzone = ({ message, onFileChange }) => {
  const [preview, setPreview] = useState(null);

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    maxSize: 20000000,
    accept: "image/gif, image/jpeg, image/png",
  });

  const file = acceptedFiles?.[0];

  useEffect(() => {
    let cancelled = false;

    if (file) {
      const reader = new FileReader();
      reader.onloadend = (event) => {
        if (cancelled) return;

        const dataUrl = event.target.result;
        if (file.type === "image/gif") {
          setPreview(dataUrl);
          onFileChange(dataUrl);
          return;
        }

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          if (cancelled) return;
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = canvasSize;
          offscreenCanvas.height = canvasSize;
          const ctx = offscreenCanvas.getContext("2d");
          ctx.clearRect(0, 0, canvasSize, canvasSize);
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          const squareDataUrl = offscreenCanvas.toDataURL();
          setPreview(squareDataUrl);
          onFileChange(squareDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }

    return () => {
      cancelled = true;
      setPreview(null);
      onFileChange(null);
    };
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

      {preview && (
        <div className="preview">
          <img src={preview} alt="Upload preview" />
        </div>
      )}
    </div>
  );
};

export default Dropzone;
