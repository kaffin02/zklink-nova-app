import { useAccount } from 'wagmi'
import InviteCode from './components/InviteCode'
// import Performance from './components/Performance'
import Step from './components/Step'
import { useSelector } from 'react-redux'

export default function Airdrop() {
    const { isConnected } = useAccount()
    const { inviteCode } = useSelector((store: any) => store.airdrop)

    return (
        <>
            {inviteCode || isConnected ? <Step /> : <InviteCode />}
            {/* <Performance /> */}
        </>
    )
}
