const UNITS = [
  'zero',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];

const TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];

const HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

function under100(n: number): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  return unit === 0 ? TENS[ten] : `${TENS[ten]} e ${UNITS[unit]}`;
}

function under1000(n: number): string {
  if (n === 100) return 'cem';
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred === 0) return under100(rest);
  if (rest === 0) return HUNDREDS[hundred];
  return `${HUNDREDS[hundred]} e ${under100(rest)}`;
}

function numberToWordsPt(n: number): string {
  if (n < 0 || n > 9999 || !Number.isInteger(n)) {
    return String(n)
      .split('')
      .map((digit) => UNITS[parseInt(digit, 10)] ?? digit)
      .join(' ');
  }
  if (n < 1000) return under1000(n);

  const thousand = Math.floor(n / 1000);
  const rest = n % 1000;
  const thousandPart = thousand === 1 ? 'mil' : `${under1000(thousand)} mil`;
  if (rest === 0) return thousandPart;
  if (rest < 100) return `${thousandPart} e ${under1000(rest)}`;
  return `${thousandPart} ${under1000(rest)}`;
}

export function numberToWords(value: string | number): string {
  const str = String(value).trim();
  const alphaMatch = str.match(/^([A-Za-z]+)?(\d+)$/);
  if (alphaMatch) {
    const [, prefix, numPart] = alphaMatch;
    const words = numberToWordsPt(parseInt(numPart, 10));
    return prefix ? `${prefix.toUpperCase()} ${words}` : words;
  }
  if (/^\d+$/.test(str)) {
    return numberToWordsPt(parseInt(str, 10));
  }
  return str;
}

export function formatVoiceMessage(template: string, password: string): string {
  return template
    .replace(/\{senha_extenso\}/g, numberToWords(password))
    .replace(/\{senha\}/g, password);
}
