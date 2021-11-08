import { useEffect, useState } from 'react'
import twitterLogo from './assets/twitter-logo.svg'
import './App.css'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, Provider, web3 } from '@project-serum/anchor'
import idl from './idl.json'
import keyPair from './keypair.json'

const { SystemProgram, Keypair } = web3
const arr = Object.values(keyPair._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)
const programID = new PublicKey(idl.metadata.address)
const network = clusterApiUrl('devnet')
const opts = {
	preflightCommitment: 'processed',
}

// Constants
const TWITTER_HANDLE = '_buildspace'
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`
const TEST_GIFS = [
	// 'https://tenor.com/view/nope-sneaky-rainbow-six-siege-baby-gif-14961114',
	'https://media.giphy.com/media/iSYq3CqeBafSax6SPF/giphy.gif',
	'https://media.giphy.com/media/W2iJwNAECynsNXmpuG/giphy.gif',
	'https://media.giphy.com/media/dyEz5ea5hak39hcPIl/giphy.gif',
	'https://media.giphy.com/media/YT1qr7rlnT8JaA8Gqk/giphy.gif',
]

const App = () => {
	const [walletAddress, setWalletAddress] = useState(null)
	const [gifLink, setGifLink] = useState('')
	const [gifList, setGifList] = useState([])
	/*
	 * This function holds the logic for deciding if a Phantom Wallet is
	 * connected or not
	 */
	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window

			if (solana) {
				if (solana.isPhantom) {
					console.log('Phantom Wallet Found')

					/*
					 * The solana object gives us a function that will allow us to connect
					 * directly with the user's wallet!
					 */
					const response = await solana.connect({
						onlyIfTrusted: true,
					})

					console.log(
						`Connected with public key: ${response.publicKey.toString()}`
					)

					setWalletAddress(response.publicKey.toString())
				}
			} else alert('Solana object not found! Get a Phantom Wallet 👻')
		} catch (error) {
			console.error(error)
		}
	}

	const connectWallet = async () => {
		const { solana } = window

		if (solana) {
			const response = await solana.connect()
			console.log(
				'Connected with Public Key:',
				response.publicKey.toString()
			)
			setWalletAddress(response.publicKey.toString())
		}
	}

	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment)
		const provider = new Provider(
			connection,
			window.solana,
			opts.preflightCommitment
		)
		return provider
	}

	const createGifAccount = async () => {
		try {
			const provider = getProvider()
			const program = new Program(idl, programID, provider)
			console.log('ping')
			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId,
				},
				signers: [baseAccount],
			})
			console.log(
				'Created a new BaseAccount w/ address:',
				baseAccount.publicKey.toString()
			)
			await getGifList()
		} catch (error) {
			console.error('Error creating base account', error)
		}
	}

	const onInputChange = async (event) => {
		const { value } = event.target
		setGifLink(value)
	}

	const sendGIF = async () => {
		if (gifLink.length > 0) {
			console.log(`GIF Link: ${gifLink}`)
			try {
				const provider = getProvider()
				const program = new Program(idl, programID, provider)
				await program.rpc.addGif(gifLink, {
					accounts: {
						baseAccount: baseAccount.publicKey,
					},
				})
				console.log('Success: GIF Sent to program ', gifLink)
				await getGifList()
			} catch (error) {
				console.error('Error sending GIF', error)
			}
		} else {
			console.log('Empty Input.')
			return
		}
	}

	const getGifList = async () => {
		try {
			const provider = getProvider()
			const program = new Program(idl, programID, provider)
			const account = await program.account.baseAccount.fetch(
				baseAccount.publicKey
			)
			console.log('Got the account', account)
			setGifList(account.gifList)
		} catch (error) {
			console.error(error)
			setGifList(null)
		}
	}

	const renderConnectedContainer = () => {
		if (gifList === null) {
			return (
				<div className="connected-container">
					<button
						className="cta-button submit-gif-button"
						onClick={createGifAccount}
					>
						Do One-Time Initialization For GIF Program Account
					</button>
				</div>
			)
		} else {
			return (
				<div className="connected-container">
					<input
						type="text"
						placeholder="Enter gif link!"
						value={gifLink}
						onChange={onInputChange}
					/>
					<button
						className="cta-button submit-gif-button"
						onClick={sendGIF}
					>
						Submit
					</button>
					<div className="gif-grid">
						{/* We use index as the key instead, also, the src is now item.gifLink */}
						{gifList.map((item, index) => (
							<div className="gif-item" key={index}>
								<img src={item.gifLink} />
							</div>
						))}
					</div>
				</div>
			)
		}
	}

	/*
	 * We want to render this UI when the user hasn't connected
	 * their wallet to our app yet.
	 */
	const renderNotConnectedContainer = () => (
		<button
			className="cta-button connect-wallet-button"
			onClick={connectWallet}
		>
			Connect to Wallet
		</button>
	)

	useEffect(() => {
		window.addEventListener('load', async (event) => {
			await checkIfWalletIsConnected()
		})
	}, [])

	useEffect(() => {
		if (walletAddress) {
			console.log('Fetching GIF list...')

			// setGifList(TEST_GIFS)
			getGifList()
		}
	}, [walletAddress])

	return (
		<div className="App">
			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? 'authed-container' : 'container'}>
				<div className="header-container">
					<p className="header">🖼 GIF Portal</p>
					<p className="sub-text">
						View your GIF collection in the metaverse ✨
					</p>
					{!walletAddress && renderNotConnectedContainer()}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className="footer-container">
					<img
						alt="Twitter Logo"
						className="twitter-logo"
						src={twitterLogo}
					/>
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built on @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	)
}

export default App
