require('dotenv').config({ path: '.env.local' });
const { verifyTypedData, getAddress, recoverTypedDataAddress } = require('viem');

const wallet = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';
const level = 1;
const countryCode = 250;
const expiry = 1803833136n;
const signature = '0xd1c6993e68b621c112ac16fde1b496c5e30a21a5311580ff0b3443945e445e54678837051a5be7e4bbf079d85961019b5787744aa2c27cf44dfa3bb3f222fb2a1b';

const DOMAIN = {
  name: 'RWA KYC Verifier',
  version: '1',
  chainId: 97,
  verifyingContract: getAddress('0x697430f860ec4ec6506317b0225861860b76c7d8'),
};

const types = {
  KYCProof: [
    { name: 'wallet', type: 'address' },
    { name: 'level', type: 'uint8' },
    { name: 'countryCode', type: 'uint16' },
    { name: 'expiry', type: 'uint256' },
  ],
};

async function test() {
  const recovered = await recoverTypedDataAddress({
    domain: DOMAIN,
    types,
    primaryType: 'KYCProof',
    message: {
      wallet: getAddress(wallet),
      level,
      countryCode,
      expiry,
    },
    signature,
  });
  console.log('Recovered signer:', recovered);
  console.log('Expected signer:', '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969');
  console.log('Match:', recovered.toLowerCase() === '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969'.toLowerCase());
}

test();
