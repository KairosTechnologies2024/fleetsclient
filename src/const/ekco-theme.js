const EkcoTheme = {
  blue: '#0f3054',
  white: '#fff',
  red: '#c0392b',
  green: '#27ae60',
  grey: '#7f8c8d',
  lightGrey: '#ecf0f1',
  purple: '#3498db',

  get WhiteButton() {
    return {
      backgroundColor: this.white,
      color: this.blue
    };
  },

  get BlueButton() {
    return {
      backgroundColor: this.blue,
      color: this.white
    };
  },

  get RedButton() {
    return {
      backgroundColor: this.white,
      color: this.red
    };
  },

  get EkcoCard() {
    const greyRgb = hexToRgb(this.grey);
    return {
      border: `1px solid rgba(${greyRgb}, 0.2)`,
      boxShadow: `0 3px 6px rgba(127, 140, 141, 0.3)`,
      backgroundColor: this.white,
      padding: `0px`
    };
  },

  get EkcoFleetHolder() {
    return {
      height: '80vh'
    };
  },

  get EkcoFleetList() {
    return {
      height: '80vh',
      overflow: 'auto'
    };
  },

  get EkcoMap() {
    return {
      // border: `1px solid rgba(${greyRgb}, 0.2)`,
      // boxShadow: `0 3px 6px rgba(127, 140, 141, 0.3)`,
      backgroundColor: this.white,
      padding: `0px`,
      borderRadius: `10px`,
      marginLeft: `10px`,
      height: `100%`
    };
  },
};

export default EkcoTheme;

const hexToRgb = (hex) => {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  return `${r}, ${g}, ${b}`;
};