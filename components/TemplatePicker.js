import React, { useCallback, useState } from "react";

const TemplatePicker = ({ items, texts, onTemplateChange }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectTemplate = useCallback(
    (index) => {
      setSelectedIndex(index);
      onTemplateChange(index);
    },
    [onTemplateChange]
  );

  const selectedTemplate = items[selectedIndex];

  return (
    <div className="template-picker animate__animated animate__bounceInUp">
      {selectedTemplate && (
        <div className="media-selected">
          <img src={selectedTemplate.original} alt={texts.template_selected} />
        </div>
      )}

      <div className="media-grid">
        {items.map((item, index) => (
          <button
            className={`media-item ${selectedIndex === index ? "is-selected" : ""}`}
            key={item.original}
            type="button"
            onClick={() => selectTemplate(index)}
            aria-label={`${texts.button_template} ${index + 1}`}
          >
            <img src={item.original} alt={`${texts.button_template} ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplatePicker;
