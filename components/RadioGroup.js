import React from "react";

const RadioGroup = ({ items, checkedItem, onChange }) => {
  return (
    <div>
      {items.map(({ name, title }) => (
        <label key={name}>
          <input
            type="radio"
            className="nes-radio"
            name={name}
            checked={checkedItem === name}
            onChange={onChange}
          />
          <span>{title}</span>
        </label>
      ))}
    </div>
  );
};

export default RadioGroup;
