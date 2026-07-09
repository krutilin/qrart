import React from "react";

const RadioGroup = ({ items, checkedItem, groupName = "radio-group", onChange }) => {
  return (
    <div className="radio-group" role="radiogroup">
      {items.map(({ name, title }) => (
        <label key={name} htmlFor={`${groupName}-${name}`}>
          <input
            id={`${groupName}-${name}`}
            type="radio"
            className="nes-radio"
            name={groupName}
            value={name}
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
