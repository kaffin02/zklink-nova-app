import { useState, useMemo, useCallback, useEffect } from "react";
import styled from "styled-components";
import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
  Select,
  SelectItem,
  Tooltip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  AiOutlineCheck,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineSearch,
} from "react-icons/ai";
import cionIcon from "@/assets/img/cion.png";
import toast from "react-hot-toast";

import { useBridgeTx } from "@/hooks/useBridgeTx";
import { utils } from "ethers";
import { useBridgeNetworkStore } from "@/hooks/useNetwork";
import Tokens from "@/constants/tokens";
import { STORAGE_NETWORK_KEY } from "@/constants";
import fromList from "@/constants/fromChainList";
import useTokenBalanceList from "@/hooks/useTokenList";
import { ETH_ADDRESS } from "zksync-web3/build/src/utils";
import { useDispatch, useSelector } from "react-redux";
import { bindInviteCodeWithAddress, getInvite, checkInviteCode } from "@/api";
import { RootState } from "@/store";
import { setInvite } from "@/store/modules/airdrop";
const ModalSelectItem = styled.div`
  &:hover {
    background-color: rgb(61, 66, 77);
    border-radius: 8px;
  }
`;
const Container = styled.div`
  background: #313841;
  padding: 32px;
  border-radius: 12px;
`;
const SelectBox = styled.div`
  & {
    background: #23262d;
    border-radius: 16px;
  }
  .selector {
    background-color: #313841;
    height: 40px;
    &:hover {
      background-color: rgb(85 90 102);
    }
  }
  .points-box {
    color: #a0a5ad;
    font-size: 16px;
    font-weight: 400;
    .input-wrapper {
      padding-top: 0;
      padding-bottom: 0;
      height: 38px;
    }
  }
`;

const AssetTypes = [
  { label: "ALL", value: "ALL" },
  {
    label: "Native",
    value: "NATIVE",
  },
  {
    label: "Stable",
    value: "STABLE",
  },
  {
    label: "LST",
    value: "LST",
  },
  {
    label: "LRT",
    value: "LRT",
  },
];
export interface IBridgeComponentProps {
  isFirstDeposit: boolean;
  onClose?: () => void;
  bridgeToken?: string;
}
const InviteCodeTypes = [
  { label: "Join Group", value: "join" },
  { label: "Create Group", value: "create" },
];
export default function Bridge(props: IBridgeComponentProps) {
  const { isFirstDeposit, onClose, bridgeToken } = props;
  const web3Modal = useWeb3Modal();
  const { isConnected, address } = useAccount();
  const fromModal = useDisclosure();
  const tokenModal = useDisclosure();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendDepositTx, loading } = useBridgeTx();
  const [amount, setAmount] = useState(0);
  const [inviteCodeType, setInviteCodeType] = useState(
    InviteCodeTypes[0].value
  );
  const { inviteCode, signature, twitter, invite } = useSelector(
    (store: RootState) => store.airdrop
  );

  const [inputInviteCode, setInputInviteCode] = useState("");

  const [fromActive, setFromActive] = useState(0);
  const [tokenActive, setTokenActive] = useState(0);
  // const { setNetworkKey } = useNetworkStore();
  const { setNetworkKey } = useBridgeNetworkStore();
  const { tokenList, refreshTokenBalanceList } = useTokenBalanceList();

  const [points, setPoints] = useState(0);
  const [showNoPointsTip, setShowNoPointsTip] = useState(false);
  const [minDepositValue, setMinDepositValue] = useState(0.1);
  const dispatch = useDispatch();

  useEffect(() => {
    if (inviteCode) {
      setInputInviteCode(inviteCode);
    }
  }, [inviteCode, setInputInviteCode]);

  useEffect(() => {
    //TODO compute eth value, if less than minDepositValue, show 0 points
  }, [tokenActive, tokenList, amount, minDepositValue]);

  useEffect(() => {
    if (isFirstDeposit) {
      const network = localStorage.getItem(STORAGE_NETWORK_KEY);
      if (network) {
        setNetworkKey(network);
        if (fromList[0].networkKey !== network) {
          const index = fromList.findIndex(
            (item) => item.networkKey === network
          );
          if (index > -1) {
            setFromActive(index);
          }
        }
      } else if (!network) {
        setNetworkKey(fromList[0].networkKey);
      }
    } else if (bridgeToken) {
      const token = Tokens.find((item) => item.address === bridgeToken);
      if (token) {
        const _tokenList = Tokens.filter(
          (item) => item.networkKey === token.networkKey
        );
        let index = 0;
        const fromIndex = fromList.findIndex(
          (item) => item.networkKey === token.networkKey
        );
        const from = fromList[fromIndex];
        if (token.address !== ETH_ADDRESS) {
          index = _tokenList.findIndex(
            (item) => item.address === token.address
          );
          if (from?.isEthGasToken) {
            index++;
          }
          setTokenActive(index);
        }
        setFromActive(fromIndex);
        setNetworkKey(from.networkKey);
      }
    }
  }, [setNetworkKey, isFirstDeposit, bridgeToken]);

  useEffect(() => {
    //TODO get points from api;
    //TODO get current min deposit value
    //TODO set if show no points tip
    setPoints(200);
  }, [amount, tokenActive]);

  const handleFrom = (index: number) => {
    setFromActive(index);
    setNetworkKey(fromList[index].networkKey);
    fromModal.onClose();
  };

  const handeToken = (index: number) => {
    setTokenActive(index);
    tokenModal.onClose();
  };

  const invalidChain = useMemo(() => {
    return chainId !== fromList[fromActive].chainId;
  }, [chainId, fromActive]);

  const actionBtnDisabled = useMemo(() => {
    if (
      !invalidChain &&
      tokenList[fromActive] &&
      (!tokenList[fromActive].balance || tokenList[fromActive].balance! < 0)
    ) {
      return true;
    }
    return false;
  }, [tokenList, fromActive, invalidChain]);

  const btnText = useMemo(() => {
    if (invalidChain) {
      return "Switch Network";
    } else {
      return "Continue";
    }
  }, [invalidChain]);

  const handleAction = useCallback(async () => {
    if (isFirstDeposit && inviteCodeType === "join") {
      if (!inputInviteCode) {
        toast.error("Please enter invite code to join group.");
        return;
      } else {
        //TODO check invite code
        const result = await checkInviteCode(inputInviteCode);
        console.log("check code result: ", result);
        if (!result || !result.result) {
          toast.error("Invalid invite code");
          return;
        }
      }
    }
    if (!address) return;
    if (invalidChain) {
      switchChain(
        { chainId: fromList[fromActive].chainId },
        {
          onError: (e) => {
            console.log(e);
          },
        }
      );
      return;
    }
    if (!amount) {
      return;
    }
    try {
      await sendDepositTx(
        tokenList[tokenActive]?.address as `0x${string}`,
        utils.parseEther(String(amount))
      );
    } catch (e) {
      return;
    }

    refreshTokenBalanceList();
    if (isFirstDeposit) {
      try {
        const resBind = await bindInviteCodeWithAddress({
          address,
          code: inviteCodeType === "join" ? inputInviteCode : "",
          siganture: signature,
          twitterHandler: twitter?.username || "mickeywang",
          twitterName: twitter?.name || "mickey",
        });

        if (resBind?.error) {
          toast.error(resBind.message)
        }

        const res = await getInvite(address);
        if (res?.result) {
          dispatch(setInvite(res?.result));
        }
      } catch (e) {
        console.log(e);
        if (e.message === "Invalid code") {
          toast.error("Invalid invite code");
        } else if (e.message === "The invitation limit has been reached") {
          //TODO can not invite more
          toast.error("The invitation limit has been reached");
        }
      }
    }
    //TODO call api to save referel data
    onClose?.();
  }, [
    isFirstDeposit,
    inviteCodeType,
    address,
    invalidChain,
    amount,
    sendDepositTx,
    tokenList,
    tokenActive,
    refreshTokenBalanceList,
    onClose,
    inputInviteCode,
    switchChain,
    fromActive,
    signature,
    twitter?.username,
    twitter?.name,
    dispatch,
  ]);

  return (
    <>
      <Container className="">
        <SelectBox className="px-6 py-6 ">
          <div className="flex items-center gap-4">
            <span className="font-bold">From</span>
            <div
              className="selector flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
              onClick={() => fromModal.onOpen()}
            >
              <Avatar
                src={fromList[fromActive].icon}
                style={{ width: 24, height: 24 }}
              />
              <span>{fromList[fromActive].label}</span>
              {fromModal.isOpen ? <AiOutlineUp /> : <AiOutlineDown />}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <Input
              classNames={{ input: "text-4xl" }}
              size="lg"
              type="number"
              placeholder="0"
              variant={"underlined"}
              value={String(amount)}
              onValueChange={setAmount}
            />

            <div
              className="selector flex items-center gap-2 px-4 py-4 rounded-3xl cursor-pointer"
              onClick={() => tokenModal.onOpen()}
            >
              <Avatar
                src={tokenList[tokenActive]?.icon}
                style={{ width: 24, height: 24 }}
              />
              <span>{tokenList[tokenActive]?.symbol}</span>
              {tokenModal.isOpen ? <AiOutlineUp /> : <AiOutlineDown />}
            </div>
          </div>
        </SelectBox>

        <SelectBox className="mt-4 px-6 py-6">
          <div className="flex items-center justify-between mb-2 points-box">
            <div className="flex items-center">
              <span>Nova Points</span>
              <span>10x Boost</span>
              <Tooltip content="some tip about nova points">
                <img
                  src={"/img/icon-help.png"}
                  className="w-[16px] cursor-pointer ml-1"
                />
              </Tooltip>
            </div>
            <div className="flex items-center">
              <span>{points}</span>
              {showNoPointsTip && (
                <Tooltip content="some tip about 0 nova points">
                  <img
                    src={"/img/icon-help.png"}
                    className="w-[16px] cursor-pointer ml-1"
                  />
                </Tooltip>
              )}
            </div>
          </div>
          {isFirstDeposit && (
            <div className="flex items-center justify-between mb-2 points-box">
              <span>Invite Code</span>
              <div className="flex items-center">
                {inviteCodeType === "join" && (
                  <Input
                    classNames={{
                      inputWrapper: "w-[120px] h-[38px] bg-[#313841] mr-2",
                    }}
                    size="sm"
                    value={inputInviteCode}
                    onValueChange={setInputInviteCode}
                    placeholder="Invite code"
                  />
                )}
                <Select
                  classNames={{ trigger: "min-h-[38px] bg-[#313841]" }}
                  className="max-w-xs w-[140px] h-[38px]"
                  value={inviteCodeType}
                  onChange={(e) => {
                    setInviteCodeType(e.target.value);
                  }}
                  size="sm"
                  selectedKeys={[inviteCodeType]}
                >
                  {InviteCodeTypes.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-2 points-box">
            <span>Est.fee</span>
            <span>0.002 ETH</span>
          </div>
        </SelectBox>
        <div className="mt-8">
          {isConnected ? (
            <Button
              className="gradient-btn w-full rounded-full"
              disableAnimation
              size="lg"
              onClick={handleAction}
              isLoading={loading}
              disabled={actionBtnDisabled}
            >
              {btnText}
            </Button>
          ) : (
            <Button
              className="gradient-btn  w-full rounded-full"
              size="lg"
              color="primary"
              disableAnimation
              onClick={() => web3Modal.open()}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </Container>
      <Modal
        style={{ minHeight: "600px", backgroundColor: "rgb(38, 43, 51)" }}
        size="2xl"
        isOpen={fromModal.isOpen}
        onOpenChange={fromModal.onOpenChange}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-3xl">
            From
          </ModalHeader>
          <ModalBody className="pb-8">
            {fromList.map((item, index) => (
              <ModalSelectItem
                className="flex items-center justify-between p-4 cursor-pointer"
                key={index}
                onClick={() => handleFrom(index)}
              >
                <div className="flex items-center">
                  <Avatar src={item.icon} className="w-12 h-12" />
                  <span className="text-xl ml-4">{item.label}</span>
                </div>

                {index === fromActive && <AiOutlineCheck size={14} />}
              </ModalSelectItem>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        style={{ minHeight: "600px", backgroundColor: "rgb(38, 43, 51)" }}
        size="2xl"
        isOpen={tokenModal.isOpen}
        onOpenChange={tokenModal.onOpenChange}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-3xl">
            Choose Token
          </ModalHeader>
          <ModalBody className="pb-8">
            {/* <div>
              <Input
                classNames={{ input: "text-xl" }}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Symbol or address"
                startContent={
                  <AiOutlineSearch className="text-2xl text-gray-400" />
                }
              />
            </div> */}
            <p>Category</p>
            <Tabs
              aria-label="Options"
              classNames={{ tabList: "w-full", tab: "w-auto" }}
            >
              {AssetTypes.map((item) => (
                <Tab key={item.value} title={item.label}></Tab>
              ))}
            </Tabs>
            {tokenList.map((item, index) => (
              <ModalSelectItem
                className="flex items-center justify-between p-4 cursor-pointer"
                key={index}
                onClick={() => handeToken(index)}
              >
                <div className="flex items-center">
                  <Avatar src={item?.icon} className="w-12 h-12" />
                  <span className="text-xl ml-4">{item?.symbol}</span>
                </div>

                <span className="text-base">{item?.formatedBalance}</span>
              </ModalSelectItem>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
