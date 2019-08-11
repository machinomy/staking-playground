import CosmosDelegateTool from 'cosmos-delegation-js'
import TransportWebAuthn from '@ledgerhq/hw-transport-webauthn'

const transport = new TransportWebAuthn()

const cdt = new CosmosDelegateTool(transport)
// node used by https://lunie.io
cdt.setNodeURL('https://lcd.nylira.net')


const buttonStake = document.getElementsByClassName('button-stake')[0]
const buttonUnstake = document.getElementsByClassName('button-unstake')[0]
const stakeInfoLine = document.getElementsByClassName('stake-info')[0]
const unstakeInfoLine = document.getElementsByClassName('unstake-info')[0]
let myAddr

connect()

async function connect () {
  await cdt.connect()

  myAddr = await cdt.retrieveAddress(0, 0)

  const balance = await getBalance(myAddr)

  const ledgerPathLine = document.getElementsByClassName('ledger-path')[0]
  ledgerPathLine.innerHTML = `HD Path: <b>${myAddr.path.join('/')}</b>`
  const ledgerPubkeyLine = document.getElementsByClassName('ledger-pubkey')[0]
  ledgerPubkeyLine.innerHTML = `Public key: <b>${myAddr.pk}</b>`
  const ledgerAddressLine = document.getElementsByClassName('ledger-address')[0]
  ledgerAddressLine.innerHTML = `Address: <b>${myAddr.bech32}</b>`
  const ledgerBalanceLine = document.getElementsByClassName('ledger-balance')[0]
  ledgerBalanceLine.innerHTML = `Current balance: <b>${balance} ATOM</b>`
  const inputValidatorAddress  = document.getElementsByClassName('input-validator-address')[0]
  // use SIKKA by default
  inputValidatorAddress.value = 'cosmosvaloper1ey69r37gfxvxg62sh4r0ktpuc46pzjrm873ae8'

  const inputUnstakeValidatorAddress  = document.getElementsByClassName('input-unstake-validator-address')[0]
  // use SIKKA by default
  inputUnstakeValidatorAddress.value = 'cosmosvaloper1ey69r37gfxvxg62sh4r0ktpuc46pzjrm873ae8'


  const delegations = await cdt.getAccountDelegations(['cosmosvaloper1ey69r37gfxvxg62sh4r0ktpuc46pzjrm873ae8'], myAddr)
  console.log('Delegations for cosmosvaloper1ey69r37gfxvxg62sh4r0ktpuc46pzjrm873ae8:' + JSON.stringify(delegations))

  updateDelegationTable()
}

async function getBalance (myAddr) {
  const reply = await cdt.retrieveBalances([myAddr])
  console.log(reply)

  return reply[0].balanceuAtom / (1000 * 1000)
}

async function updateDelegationTable () {
  const reply = await cdt.retrieveBalances([myAddr])

  const table = document.getElementsByClassName('delegation-table')[0]

  Object.keys(reply[0].delegations).forEach((k) => {
    const row = table.insertRow(1)
    row.insertCell(0).innerText = k
    row.insertCell(1).innerText = `${parseFloat((reply[0].delegations[k].uatoms / (1000 * 1000)).toFixed(6)).toString()} ATOM`
  })
}

async function onStakeButtonClick () {
  buttonStake.classList.add('loading')
  buttonStake.classList.add('disabled')

  const inputValidatorAddress  = document.getElementsByClassName('input-validator-address')[0].value
  const inputAmount  = document.getElementsByClassName('input-amount')[0].value

  if (!inputAmount.length) {
    stakeInfoLine.innerHTML = 'Please, specify amount in Atoms (not uAtoms)'
    throw Error('Please, specify amount in Atoms (not uAtoms)')
  }
  const amount = parseFloat(inputAmount)
  const balance = await getBalance(myAddr)

  if (amount > balance) {
    stakeInfoLine.innerHTML = 'Amount must be equal or less than balance'
    throw Error('Amount must be equal or less than balance')
  }

  const amountInuAtoms = Math.trunc(amount * 1000 * 1000)

  const txHash = await delegate(myAddr.path, myAddr.bech32, myAddr.pk, amountInuAtoms, inputValidatorAddress, 'Test 123')

  stakeInfoLine.innerHTML = `Successfully delegated. txHash is ${txHash}`
  console.log(`Successfully delegated. txHash is ${txHash}`)

  buttonStake.classList.remove('loading')
  buttonStake.classList.remove('disabled')
}

async function onUnstakeButtonClick () {
  buttonUnstake.classList.add('loading')
  buttonUnstake.classList.add('disabled')

  const reply = await cdt.retrieveBalances([myAddr])

  const inputValidatorAddress  = document.getElementsByClassName('input-unstake-validator-address')[0].value
  const inputAmount  = document.getElementsByClassName('input-unstake-amount')[0].value

  const stakedAmountInuAtoms = reply[0].delegations[inputValidatorAddress].uatoms

  if (!inputAmount.length) {
    unstakeInfoLine.innerHTML = 'Please, specify amount in Atoms (not uAtoms)'
    throw Error('Please, specify amount in Atoms (not uAtoms)')
  }

  const amountInuAtoms = Math.trunc(parseFloat(inputAmount) * 1000 * 1000)

  if (amountInuAtoms > stakedAmountInuAtoms) {
    unstakeInfoLine.innerHTML = 'Unstaking amount must be equal or less than staked amount'
    throw Error('Unstaking amount must be equal or less than staked amount')
  }

  const txHash = await undelegate(myAddr.path, myAddr.bech32, myAddr.pk, amountInuAtoms, inputValidatorAddress, 'Test 123')

  unstakeInfoLine.innerHTML = `Successfully undelegated. txHash is ${txHash}`
  console.log(`Successfully undelegated. txHash is ${txHash}`)

  buttonUnstake.classList.remove('loading')
  buttonUnstake.classList.remove('disabled')
}

async function delegate (path, address, pk, amountInuAtoms, validatorAddress, notes = '') {
  const txContext = {
    chainId: 'cosmoshub-2',
    path: path,
    bech32: address,
    pk: pk,
  }
  const signingRequest = await cdt.txCreateDelegate(
      txContext,
      validatorAddress,
      amountInuAtoms,
      notes,
  )
  stakeInfoLine.innerHTML = 'Please, sign request via Ledger'
  console.log('Please, sign request via Ledger')
  const signedTx = await cdt.sign(signingRequest, txContext)
  stakeInfoLine.innerHTML = 'Broadcasting signed tx'
  console.log('Broadcasting signed tx')
  const response = await cdt.txSubmit(signedTx)
  console.log(response)
  return response.data.txhash
}

async function undelegate (path, address, pk, amountInuAtoms, validatorAddress, notes = '') {
  const txContext = {
    chainId: 'cosmoshub-2',
    path: path,
    bech32: address,
    pk: pk,
  }
  const signingRequest = await cdt.txCreateUndelegate(
    txContext,
    validatorAddress,
    amountInuAtoms,
    notes,
  )
  unstakeInfoLine.innerHTML = 'Please, sign request via Ledger'
  console.log('Please, sign request via Ledger')
  const signedTx = await cdt.sign(signingRequest, txContext)
  unstakeInfoLine.innerHTML = 'Broadcasting signed tx'
  console.log('Broadcasting signed tx')
  const response = await cdt.txSubmit(signedTx)
  console.log(response)
  return response.data.txhash
}

buttonStake.addEventListener('click', () => {
  onStakeButtonClick()
})

buttonUnstake.addEventListener('click', () => {
  onUnstakeButtonClick()
})


