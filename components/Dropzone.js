import React, { useEffect } from "react";
import { useDropzone } from "react-dropzone";

const Dropzone = ({ onFileChange }) => {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    maxSize: 1000000,
    accept: "image/jpeg, image/png",
  });

  const file = acceptedFiles?.[0];
  useEffect(() => {
    onFileChange(file);
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
        <p>{`Drag 'n' drop some files here, or click to select files`}</p>
      </div>

      {file != null && (
        <div className="preview">
          <img src={URL.createObjectURL(file)} alt="Preview" />
        </div>
      )}
    </div>
  );
};

export default Dropzone;
