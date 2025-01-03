import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { FunctionHandler } from "../../types/types";
import { getTokenInfo } from "../../api/token/tokenMappings";
import fetch from "cross-fetch";
import { AssetItem, PortfolioResult, TokenInfo  } from "../../types/types";
import { API_URLS } from '@raydium-io/raydium-sdk-v2'
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'


// import { AddressLookupTableAccount, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import axios from 'axios'
// import { connection, fetchTokenAccountData } from '../config'
// import { API_URLS } from '@raydium-io/raydium-sdk-v2'

interface SwapCompute {
  id: string
  success: true
  version: 'V0' | 'V1'
  openTime?: undefined
  msg: undefined
  data: {
    swapType: 'BaseIn' | 'BaseOut'
    inputMint: string
    inputAmount: string
    outputMint: string
    outputAmount: string
    otherAmountThreshold: string
    slippageBps: number
    priceImpactPct: number
    routePlan: {
      poolId: string
      inputMint: string
      outputMint: string
      feeMint: string
      feeRate: number
      feeAmount: string
    }[]
  }
}

if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
  throw new Error('Helius API key not found');
}

const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

const connection = new Connection(
  url || clusterApiUrl("mainnet-beta"),
  "confirmed"
);

export const fetchTokenAccountData = async (owner:PublicKey) => {

  // if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
  //   throw new Error('Helius API key not found');
  // }

  // const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  // const connection = new Connection(
  //   url || clusterApiUrl("mainnet-beta"),
  //   "confirmed"
  // );
  const solAccountResp = await connection.getAccountInfo(owner)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: owner,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}


export const addFeeInstruction  = ( buyer: PublicKey, amount: number) =>  {
  const feeAmount: number = amount*0.1; // Calculate 1% fee
  const platform: PublicKey = new PublicKey("9141d9WwahdVTPD1y6X5E3wK9F8d5LyTqR6dQHTC9P7X");
  const feeInstruction = SystemProgram.transfer({
    fromPubkey: buyer,
    toPubkey: platform,
    lamports: feeAmount,
  })
  return feeInstruction;
};



export const sellToken = async (owner:PublicKey, mint:PublicKey, tokenAmount: number) => {
  console.log('Selling', tokenAmount, 'tokens')
  // Input is RAY (or your token), output is SOL
  const inputMint = mint.toBase58(); // RAY token
  const outputMint = NATIVE_MINT.toBase58()
  const slippage = 0.5
  const txVersion: string = 'V0'
  const isV0Tx = txVersion === 'V0'

  const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  const connection = new Connection(rpcUrl || clusterApiUrl("mainnet-beta"), "confirmed");

  // Convert amount to proper decimals (RAY has 6 decimals)
  const RAY_DECIMALS = 6
  const scaledAmount = tokenAmount * Math.pow(10, RAY_DECIMALS)

  // First get a quote to know how much SOL we'll receive
  console.log('Requesting quote for', scaledAmount, 'RAY tokens')
  const { data: quoteResponse } = await axios.get<SwapCompute>(
    `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${scaledAmount}&slippageBps=${slippage * 100}&txVersion=${txVersion}`
  )

  if (!quoteResponse.success) {
    console.error('Quote failed:', quoteResponse)
    throw new Error('Failed to get quote: ' + quoteResponse.msg)
  }

  // Calculate fee based on expected SOL return (1% of SOL amount)
  const expectedSolReturn = Number(quoteResponse.data.outputAmount)
  const feeAmount = Math.floor(expectedSolReturn * 0.01) // 1% fee

  const addFeeInstruction = (owner: PublicKey, feeInLamports: number) => {
    const platform = new PublicKey("9141d9WwahdVTPD1y6X5E3wK9F8d5LyTqR6dQHTC9P7X")
    return SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: platform,
      lamports: feeInLamports,
    })
  }

  // Get token accounts
  const { tokenAccounts } = await fetchTokenAccountData(owner);
  const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === inputMint)?.publicKey
  const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === outputMint)?.publicKey

  if (!inputTokenAcc) {
    throw new Error('No input token account found')
  }

  // Get transaction data
  const { data: swapTransactions } = await axios.post(
    `${API_URLS.SWAP_HOST}/transaction/swap-base-in`,
    {
      computeUnitPriceMicroLamports: '1',
      swapResponse: quoteResponse,
      txVersion,
      wallet: owner.toBase58(),
      wrapSol: false,
      unwrapSol: true,
      inputAccount: inputTokenAcc.toBase58(),
      outputAccount: outputTokenAcc?.toBase58(),
    }
  )

  console.log('Expected SOL return:', expectedSolReturn / LAMPORTS_PER_SOL, 'SOL')
  console.log('Fee amount:', feeAmount , 'LAMPORTS')

  // Process transaction
interface SwapTransaction {
    transaction: string
}

interface SwapResponse {
    data: SwapTransaction[]
}
// @ts-ignore
const allTxBuf: Buffer[] = (swapTransactions as SwapTransactionsResponse).data.map((tx: SwapTransaction) => Buffer.from(tx.transaction, 'base64'))
  const allTransactions = allTxBuf.map((txBuf) => VersionedTransaction.deserialize(txBuf))

  for (const tx of allTransactions) {
    try {
      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      // Get lookup tables
      const addressLookupTableAccounts = await Promise.all(
        tx.message.addressTableLookups.map(async (lookup) => {
          return await connection.getAddressLookupTable(lookup.accountKey).then((res) => res.value)
        })
      )

      const validAddressLookupTableAccounts = addressLookupTableAccounts.filter(
        (account): account is AddressLookupTableAccount => account !== null
      )

      // Get all accounts
      const accounts = tx.message.getAccountKeys({ addressLookupTableAccounts: validAddressLookupTableAccounts })

      // Create new message with swap and fee instructions
      const feeIx = addFeeInstruction(owner, feeAmount)
      const newMessage = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions: [
          // First do the swap
          ...tx.message.compiledInstructions.map((ix) => ({
            programId: accounts.get(ix.programIdIndex)!,
            keys: ix.accountKeyIndexes.map((idx) => ({
              pubkey: accounts.get(idx)!,
              isSigner: tx.message.isAccountSigner(idx),
              isWritable: tx.message.isAccountWritable(idx),
            })),
            data: Buffer.from(ix.data),
          })),
          // Then add the fee instruction
          feeIx,
        ],
      }).compileToV0Message()

      // Send and confirm transaction
      const newTx = new VersionedTransaction(newMessage);
      return newTx;
      // newTx.sign([owner])
      
      const txId = await connection.sendTransaction(newTx, {
        skipPreflight: true,
        maxRetries: 3,
        preflightCommitment: 'confirmed',
      })

      console.log('Transaction sent:', txId)

      await connection.confirmTransaction({
        signature: txId,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed')

      console.log('Transaction confirmed!')
      console.log('Sold', tokenAmount, 'tokens for', expectedSolReturn / LAMPORTS_PER_SOL, 'SOL')
      console.log('Paid', feeAmount / LAMPORTS_PER_SOL, 'SOL in fees')

    } catch (e: any) {
      console.error('Transaction failed:', e.message)
      return null;
      throw e;
      return e;
    }
  }
}

export const buyToken = async (owner:PublicKey, mint:PublicKey, amountinSol:number) => {

  console.log('Buying', amountinSol, 'SOL worth of tokens')

  // if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
  //   throw new Error('Helius API key not found');
  // }

  // const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  // const connection = new Connection(
  //   url || clusterApiUrl("mainnet-beta"),
  //   "confirmed"
  // );

  const inputMint = NATIVE_MINT.toBase58();


  const outputMint =  mint.toBase58();
  const amount = amountinSol*LAMPORTS_PER_SOL

  const slippage = 0.5 // in percent, for this example, 0.5 means 0.5%
  const txVersion: string = 'V0' // or LEGACY
  const isV0Tx = txVersion === 'V0'

  const [isInputSol, isOutputSol] = [inputMint === NATIVE_MINT.toBase58(), outputMint === NATIVE_MINT.toBase58()]
  

  const { tokenAccounts } = await fetchTokenAccountData(owner);
  // console.log('tokenAccounts', tokenAccounts);
  const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === inputMint)?.publicKey
  const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === outputMint)?.publicKey

  if (!inputTokenAcc && !isInputSol) {
    console.error('do not have input token account')
    return null;
  }

  // get statistical transaction fee from api
  /**
   * vh: very high
   * h: high
   * m: medium
   */
  const { data } = await axios.get<{
    id: string
    success: boolean
    data: { default: { vh: number; h: number; m: number } }
  }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`)

  const { data: swapResponse } = await axios.get<SwapCompute>(
    `${
      API_URLS.SWAP_HOST
    }/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
      slippage * 100
    }&txVersion=${txVersion}`
  )

  const { data: swapTransactions } = await axios.post<{
    id: string
    version: string
    success: boolean
    data: { transaction: string }[]
  }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
    computeUnitPriceMicroLamports: String(data.data.default.h),
    swapResponse,
    txVersion,
    wallet: owner.toBase58(),
    wrapSol: isInputSol,
    unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
    inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
    outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
  })
  swapTransactions.data.forEach((tx) => console.log(
    // tx.transaction.
    "This is transaction message --->",tx.transaction
))

  const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
  
  const allTransactions = allTxBuf.map((txBuf) =>
    isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
  )


  console.log(`total ${allTransactions.length} transactions`, swapTransactions)

  let idx = 0
  if (!isV0Tx) {
    // for (const tx of allTransactions) {
    //     console.log(" this is not a isV0Tx");
    //   console.log(`${++idx} transaction sending...`)
    //   const transaction = tx as Transaction
    //   const feeInstruction = addFeeInstruction(owner, amount);
    //   transaction.add(feeInstruction);
    //   return transaction;
    //   // transaction.sign(owner)
    //   // const txId = await sendAndConfirmTransaction(connection, transaction, [owner], { skipPreflight: true })
    //   // console.log(`${++idx} transaction confirmed, txId: ${txId}`)
    // }
  } else {
    console.log('This is V0 transaction');
    for (const tx of allTransactions) {
      idx++
      const transaction = tx as VersionedTransaction
      
      try {
        // Get fresh blockhash first with longer validity
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        // Create fee instruction
        const feeIx = addFeeInstruction(owner, amount);
        
        // Get the lookup table accounts
        const addressLookupTableAccounts = await Promise.all(
          transaction.message.addressTableLookups.map(async (lookup) => {
            return await connection.getAddressLookupTable(lookup.accountKey).then((res) => res.value);
          })
        );
        
        const validAddressLookupTableAccounts = addressLookupTableAccounts.filter((account): account is AddressLookupTableAccount => account !== null);
        const accounts = transaction.message.getAccountKeys({ addressLookupTableAccounts: validAddressLookupTableAccounts });
        
        // Create new message with fee instruction
        const newMessage = new TransactionMessage({
          payerKey: owner,
          recentBlockhash: blockhash,
          instructions: [
            feeIx,
            ...transaction.message.compiledInstructions.map((ix) => ({
              programId: accounts.get(ix.programIdIndex)!,
              keys: ix.accountKeyIndexes.map((idx) => ({
                pubkey: accounts.get(idx)!,
                isSigner: transaction.message.isAccountSigner(idx),
                isWritable: transaction.message.isAccountWritable(idx),
              })),
              data: Buffer.from(ix.data),
            })),
          ],
        }).compileToV0Message();

        const newTx = new VersionedTransaction(newMessage);
        return newTx;
        // newTx.sign([owner]);
        
        // Send with retries and wait for confirmation
        const txId = await connection.sendTransaction(newTx, { 
          skipPreflight: true,
          maxRetries: 5,
          preflightCommitment: 'confirmed'
        });
        
        console.log(`${idx} transaction sending..., txId: ${txId}`);
        
        // Wait for confirmation with timeout
        const confirmation = await Promise.race([
          connection.confirmTransaction({
            signature: txId,
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight
          }, 'confirmed'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
          )
        ]);
        
        console.log(`${idx} transaction confirmed:`, confirmation);
      } catch (e: any) {
        console.error(`Transaction failed: ${e.message}`);
        // throw e;
        return null;
      }
    }
  }
}
// apiSwap();







// function checkMatch(input: string) {
//   // Define the regex patterns
//   const solRegex = /\b(sol|SOL|solana)\b/; // Matches 'sol', 'SOL', or 'solana' (case-sensitive, as requested)
//   const l24Regex = /\b(l24|L24 Ai)\b/i;   // Matches 'l24' or 'L24 Ai' (case-insensitive)

//   // Check for matches and return accordingly
//   if (solRegex.test(input)) {
//     return 'So11111111111111111111111111111111111111111';
//   } else if (l24Regex.test(input)) {
//     return 'CMDKx3TGVJryRDQ2MnAkTRNSyguQLrKgiCPZ3Jc6r8r2';
//   }

//   // Return null or a default value if no matches
//   return null;
// }

// Transaction creation functions
const create_solana_transaction = async (
  recipient_wallet: string,
  amount_sol: number,
  fromPubkey: PublicKey,
  rpcUrl?: string
) => {
  try {
    // const connection = new Connection(
    //   rpcUrl || clusterApiUrl("devnet"),
    //   "confirmed"
    // );
    const toPubkey = new PublicKey(recipient_wallet);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: amount_sol * LAMPORTS_PER_SOL,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return {
      transaction: transaction,
      connection: connection,
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};


// const buy_L24AI = async (
//   amount: number,
//   slippageBps: number,
//   userPublicKey: string,
//   rpcUrl?: string
// ) => {

//   if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
//     throw new Error('Helius API key not found');
//   }

//   const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

//   const connection = new Connection(
//     url || clusterApiUrl("mainnet-beta"),
//     "confirmed"
//   );



// }

const create_jupiter_swap = async (
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  userPublicKey: string,
  rpcUrl?: string
) => {
  // const connection = new Connection(
  //   rpcUrl || clusterApiUrl("mainnet-beta"),
  //   "confirmed"
  // );

  const quoteResponse = await (
    await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}\
&outputMint=${outputMint}\
&amount=${amount}\
&slippageBps=${slippageBps}`)
  ).json();

  const { swapTransaction } = await (
    await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: "auto",
        dynamicComputeUnitLimit: true,
      }),
    })
  ).json();

  const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  return { transaction, connection };
};

const getPortfolioBalance = async (
  walletAddress: string,
  includeNfts: boolean = true
) => {
  if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    throw new Error('Helius API key not found');
  }

  const url = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'portfolio-analysis',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 1000,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
          // Remove showNfts as it's not a valid option
          showCollectionMetadata: includeNfts,  // This is the closest equivalent
          showUnverifiedCollections: includeNfts
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const { result } = await response.json();
  return result;
};

// Function handlers map
export const functionHandlers: Record<string, FunctionHandler> = {
  send_solana_transaction: async (args, wallet, rpcUrl) => {
    if (!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
      return "Please connect your wallet first";
    }

    try {
      const { transaction, connection } = await create_solana_transaction(
        args.recipient_wallet,
        args.amount_sol,
        wallet.publicKey,
        rpcUrl
      );

      try{
        const signedTx = await wallet.signTransaction(transaction);
        if(!signedTx) {
          console.error("Transaction error:", signedTx);
          return `transaction cancled by user`;
        }
      
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      return `Transaction successful! ✅\n\n[**View on Solscan**](https://solscan.io/tx/${signature})`;
    }catch(error){
      console.error("Transaction error:", error);
      return "Transaction failed: Unknown error occurred";
    }
    } catch (error: unknown) {
      console.error("Transaction error:", error);
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return "Transaction failed: Unknown error occurred";
    }
  },

  sell_L24AI: async (args, wallet): Promise<string | null> => {
    if(!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
      return "Please connect your wallet first";
    }
    // const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    // const connection = new Connection(
    //   rpcUrl || clusterApiUrl("mainnet-beta"),
    //   "confirmed"
    // );
    try{
      const tx = await sellToken(
        wallet.publicKey,
        new PublicKey("CMDKx3TGVJryRDQ2MnAkTRNSyguQLrKgiCPZ3Jc6r8r2"),
        args.amount,
      )
      if(!tx) {
        console.error("Transaction error:", tx);
        return 'no tx';
      }
      try{
        const signedTx = await wallet.signTransaction(tx);
        console.log("signedTx", signedTx);
        if(!signedTx) {
          console.error("Transaction error:", signedTx);
          return 'user cancled the transaction';
        }
        const signature = await connection.sendRawTransaction(
          signedTx.serialize()
        );
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        return `Transaction successful! ✅\n\n[**View on Solscan**](https://solscan.io/tx/${signature})`;
      }catch(e){
        console.log("Transaction error:", e);
        return "Transaction cancled by user";
      }

    }catch (error: unknown) {
      console.error("Transaction error:", error);
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return "Transaction failed: Unknown error occurred";
    }
  },

  buy_L24AI: async (args, wallet): Promise<string | null> => {
    if (!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
      return "Please connect your wallet first";
    }

    // const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    // const connection = new Connection(
    //   rpcUrl || clusterApiUrl("mainnet-beta"),
    //   "confirmed"
    // );

    try {
      const tx = await buyToken(
        wallet.publicKey,
        new PublicKey("CMDKx3TGVJryRDQ2MnAkTRNSyguQLrKgiCPZ3Jc6r8r2"),
        args.amount,
      );

      if(!tx) {
        console.error("Transaction error:", tx);
        return "no tx";
      }

      try{
      const signedTx = await wallet.signTransaction(tx);
      console.log("signedTx", signedTx);
      if(!signedTx) {
        console.error("Transaction error:", signedTx);
        return "failed to siqn transaction";
      }
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      return `Transaction successful! ✅\n\n[**View on Solscan**](https://solscan.io/tx/${signature})`;
      }catch(e){
        console.log("Transaction error:", e);
        return "Transaction not signed by user";
      }
    } catch (error: unknown) {
      console.error("Transaction error:", error);
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return "Transaction failed: Unknown error occurred";
    }
  },


  

  // swap_tokens: async (args, wallet, rpcUrl) => {
  //   if (!wallet.connected || !wallet.signTransaction || !wallet.publicKey) {
  //     return "Please connect your wallet first";
  //   }

  //   try {
  //     const [inputTokenInfo, outputTokenInfo] = await Promise.all([
  //       checkMatch(args.inputToken),
  //       checkMatch(args.outputToken),
  //     ]);

  //     // const [inputTokenInfo, outputTokenInfo] = ["CMDKx3TGVJryRDQ2MnAkTRNSyguQLrKgiCPZ3Jc6r8r2",""];
  //     // function checkMatch(input) {
  //     //   // Define the regex patterns
  //     //   const solRegex = /\b(sol|SOL|solana)\b/; // Matches 'sol', 'SOL', or 'solana' (case-sensitive, as requested)
  //     //   const l24Regex = /\b(l24|L24 Ai)\b/i;   // Matches 'l24' or 'L24 Ai' (case-insensitive)
      
  //     //   // Check for matches and return accordingly
  //     //   if (solRegex.test(input)) {
  //     //     return 'X';
  //     //   } else if (l24Regex.test(input)) {
  //     //     return 'Y';
  //     //   }
      
  //     //   // Return null or a default value if no matches
  //     //   return null;
  //     // }

  //     if (args.amount <= 0) {
  //       throw new Error("Amount must be greater than 0");
  //     }
  //     if (args.amount > 1000000) {
  //       throw new Error("Amount too large");
  //     }

  //     const inputDecimals = inputTokenInfo.decimals;
  //     const amountWithDecimals = Math.round(
  //       args.amount * Math.pow(10, inputDecimals)
  //     );

  //     const { transaction } = await create_jupiter_swap(
  //       inputTokenInfo.address,
  //       outputTokenInfo.address,
  //       amountWithDecimals,
  //       args.slippageBps,
  //       wallet.publicKey.toString(),
  //       rpcUrl
  //     );

  //     const connection = new Connection(
  //       rpcUrl || clusterApiUrl("mainnet-beta"),
  //       "confirmed"
  //     );
  //     const signedTx = await wallet.signTransaction(transaction);
  //     const signature = await connection.sendRawTransaction(
  //       signedTx.serialize(),
  //       {
  //         skipPreflight: true,
  //         maxRetries: 2,
  //       }
  //     );

  //     const latestBlockhash = await connection.getLatestBlockhash();
  //     await connection.confirmTransaction({
  //       signature,
  //       blockhash: latestBlockhash.blockhash,
  //       lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  //     });

  //     return `Swap successful! ✅\n\n[**View on Solscan**](https://solscan.io/tx/${signature})`;
  //   } catch (error: unknown) {
  //     console.error("Swap error:", error);
  //     if (error instanceof Error) {
  //       return `Swap failed: ${error.message}`;
  //     }
  //     return "Swap failed: Unknown error occurred";
  //   }
  // },

  get_portfolio_balance: async (args, wallet) => {
    try {
      const walletAddress = args.walletAddress || wallet.publicKey?.toString();
      
      if (!walletAddress) {
        return "No wallet address provided or connected";
      }

      const portfolio = await getPortfolioBalance(walletAddress, args.includeNfts);
      
      // Format native SOL balance and value
      const solBalance = (portfolio.nativeBalance?.lamports || 0) / LAMPORTS_PER_SOL;
      const solPrice = portfolio.nativeBalance?.price_per_sol || 0;
      const solValue = portfolio.nativeBalance?.total_price || 0;
      
      let response = `📊 Portfolio Analysis for ${walletAddress}\n\n`;
      response += `💰 Native SOL Balance: ${solBalance.toFixed(4)} SOL`;
      response += ` ($${solPrice.toFixed(2)} per SOL = $${solValue.toFixed(2)})\n\n`;
      
      let totalPortfolioValue = solValue;
      
      if (portfolio.items?.length > 0) {
        response += "🪙 Token Holdings:\n";
        portfolio.items
          .filter((item: AssetItem) => item.interface === "FungibleToken")
          .forEach((token: any) => {
            const tokenBalance = token.token_info?.balance || 0;
            const decimals = token.token_info?.decimals || 0;
            const humanBalance = tokenBalance / Math.pow(10, decimals);
            const symbol = token.token_info?.symbol || token.content?.metadata?.symbol || "Unknown";
            const pricePerToken = token.token_info?.price_info?.price_per_token || 0;
            const totalValue = token.token_info?.price_info?.total_price || 0;
            
            totalPortfolioValue += totalValue;
            
            response += `- ${humanBalance.toFixed(4)} ${symbol}`;
            if (pricePerToken > 0) {
              response += ` ($${pricePerToken.toFixed(6)} per token = $${totalValue.toFixed(2)})\n`;
            } else {
              response += ` (No price data available)\n`;
            }
          });
          
        if (args.includeNfts) {
          const nfts = portfolio.items.filter((item: AssetItem) => item.interface === "V1_NFT");
          response += `\n🖼️ NFTs: ${nfts.length} items\n`;
        }
      }
      
      response += `\n💎 Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}\n`;

      return response;
    } catch (error: unknown) {
      console.error("Portfolio analysis error:", error);
      if (error instanceof Error) {
        return `Failed to get portfolio: ${error.message}`;
      }
      return "Failed to get portfolio: Unknown error occurred";
    }
  },
};