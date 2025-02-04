import {
  checkBridge,
  checkInviteCode,
  getInvite,
  getTwitterAccessToken,
  getTxByTxHash,
  registerAccount,
  registerAccountByBridge,
} from "@/api";
import TotalTvlCard from "@/components/TotalTvlCard";
import { SIGN_MESSAGE } from "@/constants/sign";
import { RootState } from "@/store";
import {
  setDepositChainId,
  setDepositTx,
  setInvite,
  setInviteCode,
  setIsCheckedInviteCode,
  setSignature,
  setSignatureAddress,
} from "@/store/modules/airdrop";
import { CardBox, FooterTvlText } from "@/styles/common";
import { getProviderWithRpcUrl, getRandomNumber, showAccount } from "@/utils";
import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import qs from "qs";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { useAccount, useSignMessage } from "wagmi";
import fromList, {
  NOVA_GOERLI_NETWORK,
  NOVA_NETWORK,
} from "@/constants/fromChainList";
import Loading from "@/components/Loading";
import { useVerifyStore } from "@/hooks/useVerifyTxHashSotre";
import { IS_MAINNET } from "@/constants";
import Toast from "@/components/Toast";
import { useConnectModal } from "@rainbow-me/rainbowkit";
const verifyFromList = [
  ...fromList,
  IS_MAINNET ? NOVA_NETWORK : NOVA_GOERLI_NETWORK,
];

// const verifyFromList = [...fromList];
const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID;
const twitterCallbackURL = import.meta.env.VITE_TWITTER_CALLBACK_URL;
const env = import.meta.env.VITE_ENV;
const isValidTwitterAccess = Boolean(
  +import.meta.env.VITE_IS_VALID_TWITTER_ACCESS
);

const BgBox = styled.div`
  position: relative;
  padding-top: 5.5rem;
  width: 100%;
  min-height: 100vh;
  background-image: image-set(
    "/img/bg-mega-yield@1x.png" 1x,
    "/img/bg-mega-yield@2x.png" 2x
  );
  background-repeat: no-repeat;
  background-size: cover;
  background-position: top;
  @media (max-width: 768px) {
    background: linear-gradient(
      0deg,
      rgba(102, 154, 255, 0.56) 0%,
      rgba(12, 14, 17, 0.56) 100%
    );
    .carBox {
      width: 100%;
      flex-direction: column;
      height: auto;
      padding: 1.5rem;
      .input-wrap {
        width: 100%;
        flex-direction: column;
      }
      .input-item {
        max-width: 100%;
        width: 100%;
      }
      .gradient-btn {
        width: 100%;
      }
      .btn-default {
        background: rgba(0, 0, 0, 0.4);
      }
      .stepItem {
        display: flex;
      }
      .step-num {
        position: relative;
        padding-right: 1.5rem;
        margin-right: 1.5rem;
        &::after {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          content: "";
          width: 1px;
          height: 5rem;
          opacity: 0.48;
          background: linear-gradient(
            180deg,
            rgba(86, 88, 90, 0) 0%,
            #85878b 48%,
            rgba(183, 187, 192, 0) 100%
          );
        }
      }
    }
  }
`;

const TitleText = styled.h4`
  color: #c2e2ff;
  // text-align: center;
  font-family: Satoshi;
  font-size: 2.5rem;
  font-style: normal;
  font-weight: 900;
  line-height: 2.5rem; /* 100% */
  letter-spacing: -0.03125rem;
  @media (max-width: 768px) {
    & {
      font-size: 2rem;
      line-height: 2rem;
      margin-bottom: 1.5rem;
    }
  }
`;
const SubTitleText = styled.p`
  color: #c6d3dd;
  // text-align: center;
  font-family: Satoshi;
  font-size: 1rem;
  font-style: normal;
  font-weight: 900;
  line-height: 2.5rem; /* 250% */
  letter-spacing: -0.03125rem;
`;

const StepNum = styled.div`
  width: 4.3125rem;
  height: 6.25rem;
  line-height: 6.25rem;
  color: #fff;
  font-family: Satoshi;
  font-size: 1rem;
  font-style: normal;
  font-weight: 900;
  letter-spacing: -0.03125rem;
  text-align: center;
`;

const StepItem = styled.div`
  .step-title {
    color: #fff;
    font-family: Satoshi;
    font-size: 1rem;
    font-style: normal;
    font-weight: 900;
    line-height: 1.5rem; /* 150% */
    letter-spacing: -0.03125rem;
  }
  .step-sub-title {
    color: #c6d3dd;
    font-family: Satoshi;
    font-size: 1rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.5rem; /* 150% */
    letter-spacing: -0.03125rem;
  }
`;

const InviteInput = styled.input`
  border-radius: 8px;
  border: 1px solid #7ba099;
  display: inline-flex;
  padding: 8px 12px 8px 12px;
  align-items: center;
  font-size: 1rem;
  color: #fff;
  font-family: Satoshi;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px; /* 150% */
  letter-spacing: -0.5px;
`;

export const enum VerifyResult {
  "SUCCESS" = "SUCCESS",
  "FAILED" = "FAILED",
  "PENDING" = "PENDING",
  "INVALID" = "INVALID",
}

export default function SoftKYC() {
  // const web3Modal = useWeb3Modal();
  const { openConnectModal } = useConnectModal();
  const verifyDepositModal = useDisclosure();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConnected, address } = useAccount();
  const {
    signature,
    inviteCode,
    depositTx,
    depositChainId,
    isCheckedInviteCode,
  } = useSelector((store: RootState) => store.airdrop);

  const [inviteCodeValue, setInviteCodeValue] = useState(inviteCode || "");
  const [isInviteCodeLoading, setIsInviteCodeLoading] = useState(false);
  const [twitterAuthCode, setTwitterAuthCode] = useState("");
  const [twitterAccessToken, setTwitterAccessToken] = useState("");
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string>(
    String(fromList[0].chainId)
  );
  const [depositTxHash, setDepositTxHash] = useState<string>("");
  const [depositStatus, setDepositStatus] = useState("");
  const [submitStatus, setSubmitStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReVerifyDeposit, setIsReVerifyDeposit] = useState(false);
  const { txhashes } = useVerifyStore();
  const [isHandleSign, setIsHandleSign] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [accessRpcLoading, setAccessRpcLoading] = useState(false);
  const [verifyDepositThirdLoading, setVerifyDepositThirdLoading] =
    useState(false);

  const [depositThirdStatus, setDepositThirdStatus] = useState("");
  const [verifyDepositTabsActive, setVerifyDepositTabsActive] = useState(0);

  const [isDepositViaThirdParty, setIsDepositViaThirdParty] = useState(false);

  const isCheckedDeposit = useMemo(() => {
    return !!depositTx || isDepositViaThirdParty;
  }, [depositTx, isDepositViaThirdParty]);

  const verifyDepositTabs = [
    {
      title: "Deposit via the Official Bridge",
      desc: "Including Portal and Parade page ",
    },
    {
      title: "Deposit via Third Party Bridge",
      desc: "Deposit through Nova Parterners",
    },
  ];

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signMessage } = useSignMessage();

  const validInviteCode = (code: string) => {
    return code && code.length === 6 ? true : false;
  };

  const onChangeInviteCode = (value: string) => {
    setInviteCodeValue(value);
    dispatch(setIsCheckedInviteCode(false));

    dispatch(setInviteCode(""));
  };

  const enterInviteCode = async (code: string) => {
    // setIsInviteCodeChecked(false);

    if (!code || code.length !== 6) return;
    setIsInviteCodeLoading(true);
    dispatch(setInviteCode(code));
    try {
      const res = await checkInviteCode(code);

      if (!res?.result) {
        // setIsInviteCodeLoading(false);
        dispatch(setIsCheckedInviteCode(false));
        toast.error("Invalid invite code. Try another.");
        return;
      }
      // setIsInviteCodeLoading(false);
      dispatch(setIsCheckedInviteCode(true));
    } catch (error) {
      console.error(error);
      // setIsInviteCodeLoading(false);
      dispatch(setIsCheckedInviteCode(false));
    } finally {
      setIsInviteCodeLoading(false);
    }
  };

  const getTwitterClientId = () => {
    let clientId = "";

    if (env === "production") {
      const clientIds = twitterClientId.split(",");
      const widgetClientIds = new Array(98).fill(clientIds[0]);
      const randomClientIds = clientIds.concat(widgetClientIds);
      const index = getRandomNumber(0, randomClientIds.length - 1);
      clientId = randomClientIds[index];
    } else {
      clientId = twitterClientId;
    }

    return clientId;
  };

  const handleConnectTwitter = () => {
    setTwitterLoading(true);
    const clientId = getTwitterClientId();
    const params = {
      response_type: "code",
      client_id: clientId,
      redirect_uri: twitterCallbackURL,
      // client_id: "RTUyVmlpTzFjTFhWWVB4b2tyb0k6MTpjaQ",
      // redirect_uri: "http://localhost:3000/aggregation-parade",
      scope:
        "tweet.read%20tweet.write%20like.write%20users.read%20follows.read%20follows.write",
      state: "state",
      code_challenge: "challenge",
      code_challenge_method: "plain",
    };
    const url = new URL(`https://twitter.com/i/oauth2/authorize`);
    url.search = qs.stringify(params, { encode: false });

    window.location.href = url.href;
  };

  const toastTwitterError = (text?: string) => {
    console.error("Could not connect to Twitter. Try again.");
    toast.error(text || "Could not connect to Twitter. Try again.", {
      duration: 3000,
    });
    setTwitterLoading(false);
  };

  const getTwitterUserFunc = async (code: string) => {
    setTwitterLoading(true);

    const clientId = getTwitterClientId();
    const params = {
      code,
      grant_type: "authorization_code",
      // client_id: "RTUyVmlpTzFjTFhWWVB4b2tyb0k6MTpjaQ",
      // redirect_uri: "http://localhost:3000/aggregation-parade",
      client_id: clientId,
      redirect_uri: twitterCallbackURL,
      code_verifier: "challenge",
    };
    try {
      const { access_token } = await getTwitterAccessToken(params);
      console.log(!access_token, isValidTwitterAccess);

      if (access_token) {
        setTwitterAccessToken(access_token);
        /**
         * Get twitter user info (if use)
         * // const { data } = await getTwitterUser(access_token);
         */
        return;
      }

      if (isValidTwitterAccess && !access_token) {
        toastTwitterError();
      }
    } catch (error: any) {
      console.error(error);
      if (isValidTwitterAccess) {
        toastTwitterError();
      }
    } finally {
      setTwitterAuthCode(code);
      setTwitterLoading(false);
    }
  };

  const [isCheckedTwitter, setIsCheckedTwitter] = useState(false);

  useEffect(() => {
    setIsCheckedTwitter(
      isValidTwitterAccess ? Boolean(twitterAccessToken) : true
    );
  }, [isValidTwitterAccess, twitterAuthCode, twitterAccessToken]);

  const handleConnectAndSign = async () => {
    if (!isConnected || !address) {
      setIsHandleSign(true);
      // web3Modal.open({ view: "Connect" });
      openConnectModal?.();
      return;
    }
    setSignLoading(true);

    await signMessage(
      {
        message: SIGN_MESSAGE,
      },
      {
        onSuccess(data, _variables, _context) {
          dispatch(setSignature(data));
          dispatch(setSignatureAddress(address));
          setSignLoading(false);
          setIsHandleSign(false);
        },
        onError(error, variables, context) {
          console.error(error, variables, context);
          setSignLoading(false);
          toast.error("User reject signature. Try again.");
        },
      }
    );
  };

  useEffect(() => {
    if (isConnected && isHandleSign) {
      handleConnectAndSign();
    }
  }, [isConnected, isHandleSign]);

  useEffect(() => {
    (async () => {
      if (depositTxHash.length === 66 && depositTxHash.startsWith("0x")) {
        try {
          const providers = verifyFromList.map((item) =>
            getProviderWithRpcUrl(item.rpcUrl)
          );
          setAccessRpcLoading(true);
          const results = await Promise.all(
            providers.map((provider) =>
              provider.getTransactionReceipt(depositTxHash)
            )
          );
          const index = results.findIndex((item) => item !== null);
          if (index > -1) {
            const winnerNetwork = verifyFromList[index];
            setSelectedChainId(String(winnerNetwork.chainId));
            setDepositStatus("");
          }
        } catch (e) {
          console.error(e);
        } finally {
          setAccessRpcLoading(false);
        }
      }
    })();
  }, [depositTxHash]);

  /**
   *  Verify deposit hash
   */
  const [verifyDepositError, setVerifyDepositError] = useState("");
  const verifyDepositHash = async () => {
    setDepositStatus("");
    setIsReVerifyDeposit(true);
    try {
      const res = await getTxByTxHash({
        txHash: depositTxHash,
        chainId: selectedChainId,
        address,
      });
      // TODO: response will return a field (as status: "PENDING") to show process ...
      if (res?.isValid) {
        setDepositStatus(VerifyResult.SUCCESS);
        dispatch(setDepositTx(depositTxHash));
        dispatch(setDepositChainId(selectedChainId));
        verifyDepositModal.onClose();
        toast.success("Your code has been successfully verified.");
      } else {
        setDepositStatus(VerifyResult.FAILED);
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message) {
        setVerifyDepositError(e.message);
      }
      setDepositStatus(VerifyResult.FAILED);
    } finally {
      setIsReVerifyDeposit(false);
    }
  };

  const verifyDepositViaThirdParty = async () => {
    if (!address) return;
    setDepositThirdStatus("");
    setVerifyDepositThirdLoading(true);

    try {
      const res = await checkBridge(address);
      if (res.result) {
        setIsDepositViaThirdParty(true);
        verifyDepositModal.onClose();
        toast.success("Your code has been successfully verified.");
      } else {
        setDepositThirdStatus(VerifyResult.FAILED);
      }
    } catch (error) {
      setDepositThirdStatus(VerifyResult.FAILED);
    } finally {
      setVerifyDepositThirdLoading(false);
    }
  };

  const getInviteFunc = async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      const res = await getInvite(address);
      if (res?.result) {
        setTimeout(() => {
          setIsLoading(false);
          dispatch(setInvite(res?.result));
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      handleSubmitError();
    }
  };

  // Submit user bind form
  const handleSubmitError = (message?: string) => {
    dispatch(setIsCheckedInviteCode(false));
    dispatch(setInviteCode(""));
    dispatch(setDepositTx(""));
    setTwitterAccessToken("");
    dispatch(setSignature(""));
    setIsDepositViaThirdParty(false);

    toast.error(
      message
        ? message
        : "Verification failed. Please recheck your invite code, wallet-tx hash relationship, and ensure your Twitter account is not binded to another address."
    );
  };

  const handleSubmit = async () => {
    if (!address || !submitStatus) return;
    setIsLoading(true);

    const inviteCodeRes = await checkInviteCode(inviteCodeValue);
    if (!inviteCodeRes?.result) {
      dispatch(setIsCheckedInviteCode(false));
      setIsLoading(false);
      toast.error("Invalid invite code. Try another.");
      return;
    }

    try {
      let res;
      if (isDepositViaThirdParty) {
        res = await registerAccountByBridge({
          address: address,
          code: inviteCodeValue,
          siganture: signature,
        });
      } else {
        res = await registerAccount({
          address: address,
          code: inviteCodeValue,
          siganture: signature,
          accessToken: twitterAccessToken || null,
          chainId: depositChainId,
          txHash: depositTx,
        });
      }

      if (+res?.status === 0) {
        getInviteFunc();
      } else {
        handleSubmitError(res?.message);
      }
    } catch (error: any) {
      // TODO: error type
      handleSubmitError(error?.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const verifyTx = searchParams.get("verifyTx");

    // if after deposit to link here, show verify tx modal
    if (verifyTx && address) {
      setSearchParams("");
      const txs = txhashes[address];

      if (txs?.length > 0) {
        const { txhash, rpcUrl } = txs[0];
        const chainId = verifyFromList.find(
          (item) => item.rpcUrl === rpcUrl
        )?.chainId;
        setSelectedChainId(String(chainId));
        setDepositTxHash(txhash);
      }
      verifyDepositModal.onOpen();
    }

    if (error) {
      toastTwitterError();
      setSearchParams("");
      return;
    }

    if (code) {
      getTwitterUserFunc(code);
      setSearchParams("");
    }
  }, [searchParams]);

  useEffect(() => {
    if (validInviteCode(inviteCode)) {
      setInviteCodeValue(inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (
      validInviteCode(inviteCodeValue) &&
      isCheckedDeposit &&
      isConnected &&
      signature
    ) {
      setSubmitStatus(true);
    } else {
      setSubmitStatus(false);
    }
  }, [inviteCodeValue, isCheckedDeposit, isConnected, signature]);

  useEffect(() => {
    if (!inviteCodeValue || inviteCodeValue?.length !== 6) {
      dispatch(setIsCheckedInviteCode(false));
    }
  }, [inviteCodeValue]);

  useEffect(() => {
    setIsDepositViaThirdParty(false);
  }, [address]);

  return (
    <BgBox>
      <Toast />
      {isLoading && <Loading />}
      <div>
        {/* Title */}
        <div className="px-6 flex flex-col-reverse md:flex-col mt-[1rem]">
          <SubTitleText className="text-left md:text-center">
            YOU'RE ALMOST THERE
          </SubTitleText>
          <TitleText className="text-left md:text-center">
            To join the zkLink Aggregation Parade S2
          </TitleText>
        </div>

        <div className="mt-[3rem] mx-[1.5rem] md:mx-auto max-w-[720px] ">
          {/* Setp 1: invite code */}
          <div className="flex justify-center gap-[0.5rem]">
            <CardBox
              className={`hidden md:block ${
                isCheckedInviteCode ? "successed" : ""
              }`}
            >
              <StepNum>01</StepNum>
            </CardBox>
            <CardBox
              className={`carBox flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                isCheckedInviteCode ? "successed" : ""
              }`}
            >
              <StepItem className="stepItem">
                <StepNum className="step-num md:hidden">01</StepNum>
                <div>
                  <p className="step-title">Enter Invite Code</p>
                  <p className="step-sub-title mt-[0.25rem]">
                    Search{" "}
                    <a
                      href="https://twitter.com/search?q=%23zkLinkNovaAggParade&src=typeahead_click"
                      className="text-[#298EDB]"
                      target="_blank"
                    >
                      #zkLinkNovaAggParade
                    </a>{" "}
                    on Twitter
                  </p>
                </div>
              </StepItem>

              <div className="input-wrap flex items-center gap-[1rem] md:gap-[0.5rem]">
                <InviteInput
                  type="text"
                  placeholder="Invite Code"
                  value={inviteCodeValue}
                  className={`input-item max-w-[120px] ${
                    isCheckedInviteCode
                      ? "bg-[#1D4138]"
                      : "bg-[rgba(0, 0, 0, 0.5)]"
                  }`}
                  // disabled={validInviteCode(inviteCode)}
                  maxLength={6}
                  onChange={(e) => onChangeInviteCode(e.target.value)}
                />

                <Button
                  className={`gradient-btn px-[1rem] py-[0.5rem] text-[1rem] ${
                    !validInviteCode(inviteCodeValue) ? "disabled" : ""
                  }`}
                  isLoading={isInviteCodeLoading}
                  disabled={
                    !validInviteCode(inviteCodeValue) || isCheckedInviteCode
                  }
                  onClick={() => enterInviteCode(inviteCodeValue)}
                >
                  <span className="ml-[0.5rem]">Verify</span>
                </Button>

                {/* {isInviteCodeChecked && (
                  <img
                    src="/img/icon-right.svg"
                    className="w-[1.5rem] h-[1.5rem]"
                  />
                )} */}
              </div>
            </CardBox>
          </div>

          {/* Step 2: connect wallet & sign */}
          <div className="flex justify-center gap-[0.5rem] mt-[1rem]">
            <CardBox
              className={`hidden md:block ${signature ? "successed" : ""}`}
            >
              <StepNum>02</StepNum>
            </CardBox>
            <CardBox
              className={`carBox flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                signature ? "successed" : ""
              }`}
            >
              <StepItem className="stepItem">
                <StepNum className="step-num md:hidden">02</StepNum>
                <div>
                  <p className="step-title">Connect your wallet</p>
                  <p className="step-sub-title mt-[0.25rem]">
                    Prove your ownership of the address
                  </p>
                </div>
              </StepItem>
              <div className="input-wrap flex items-center gap-[1rem] md:gap-[0.5rem]">
                <StepItem>
                  {isConnected && (
                    <span className="step-title ">{showAccount(address)}</span>
                  )}
                </StepItem>

                <Button
                  className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem]"
                  disabled={isConnected && Boolean(signature)}
                  onClick={handleConnectAndSign}
                  isLoading={signLoading}
                >
                  <span className="ml-[0.5rem]">
                    {isConnected && !signature ? "Sign" : "Connect and Verify"}
                  </span>
                </Button>
              </div>
            </CardBox>
          </div>

          {/* Step 3: Bridge  */}
          <div className="flex justify-center gap-[0.5rem] mt-[1rem]">
            <CardBox
              className={`hidden md:block ${
                isCheckedDeposit ? "successed" : ""
              }`}
            >
              <StepNum>03</StepNum>
            </CardBox>
            <CardBox
              className={`carBox flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                isCheckedDeposit ? "successed" : ""
              }`}
            >
              <StepItem className="stepItem">
                <StepNum className="step-num md:hidden">03</StepNum>
                <div>
                  <p className="step-title">Bridge and Earn</p>
                  <p className="step-sub-title mt-[0.25rem]">
                    {"Minimum deposit amount ≥ 0.1 ETH or equivalent"}
                  </p>
                </div>
              </StepItem>
              <div className="input-wrap flex items-center gap-[1rem] md:gap-[0.5rem]">
                <Button
                  className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem] flex items-center gap-[0.5rem]"
                  onClick={() => {
                    navigate("/bridge");
                  }}
                >
                  <Tooltip
                    content={`If you're new, simply click on 'bridge' to make a deposit.`}
                  >
                    <span className="ml-[0.5rem]">Bridge</span>
                  </Tooltip>
                </Button>

                <Tooltip content="Connect your wallet and sign the message before verifying.">
                  <Button
                    className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem] flex items-center gap-[0.5rem]"
                    disabled={Boolean(depositTx) || !address || !signature}
                    onClick={() => {
                      verifyDepositModal.onOpen();
                    }}
                  >
                    <span className="ml-[0.5rem]">Verify</span>
                  </Button>
                </Tooltip>
              </div>
            </CardBox>
          </div>

          {/* Step 4: connect twitter */}
          {/* <div className="flex justify-center gap-[0.5rem] mt-[1rem]">
            <CardBox
              className={`hidden md:block ${
                isCheckedTwitter ? "successed" : ""
              }`}
            >
              <StepNum>04</StepNum>
            </CardBox>

            <CardBox
              className={`carBox flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                isCheckedTwitter ? "successed" : ""
              }`}
            >
              <StepItem className="stepItem">
                <StepNum className="step-num md:hidden">04</StepNum>
                <div>
                  <p className="step-title">Connect Twitter</p>
                  <p className="step-sub-title mt-[0.25rem]">
                    You can only bind your Twitter account with one wallet
                  </p>
                </div>
              </StepItem>
              <div className="input-wrap flex items-center gap-[1rem] md:gap-[0.5rem]">
                {isCheckedTwitter ? (
                  <img
                    src="/img/icon-right.svg"
                    className="w-[1.5rem] h-[1.5rem] mx-auto"
                  />
                ) : (
                  <Button
                    className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem] flex items-center gap-[0.5rem]"
                    isLoading={twitterLoading}
                    onClick={handleConnectTwitter}
                  >
                    <span className="ml-[0.5rem]">Connect Twitter/X</span>
                  </Button>
                )}
              </div>
            </CardBox>
          </div> */}

          {/* Submit for user bind */}
          <div className="flex justify-center w-full md:px-[5rem] ">
            <Button
              className={`gradient-btn mx-auto mt-[1rem] md:py-[2rem] w-full text-center`}
              disabled={!submitStatus}
              onClick={handleSubmit}
            >
              <>
                <p className="step-title">
                  Participate zkLink Aggregation Parade
                </p>
              </>
            </Button>
          </div>
        </div>
      </div>

      {/* Total tvl */}
      <div className="flex flex-col justify-center items-center w-full py-[2rem] md:py-[2.5rem]">
        <FooterTvlText className="mb-[0.75rem] md:mb-[0.5rem] text-center">
          TVL
        </FooterTvlText>
        <TotalTvlCard />
      </div>

      {/* Verify deposit modal */}
      <Modal
        classNames={{ closeButton: "text-[1.5rem]" }}
        style={{ minHeight: "18rem" }}
        size="2xl"
        isOpen={verifyDepositModal.isOpen}
        onOpenChange={verifyDepositModal.onOpenChange}
      >
        <ModalContent className="py-4 mb-20 md:mb-0">
          <ModalHeader className="px-2 md:px-8">
            Verify your deposit
          </ModalHeader>
          <ModalBody className="px-2 md:px-8">
            <div className="p-[6px] flex justify-between items-center bg-[#313841] rounded-[64px] overflow-auto">
              {verifyDepositTabs.map((tab, index) => (
                <div
                  key={index}
                  className={`px-[9px] md:px-[18px] py-[6px] cursor-pointer ${
                    verifyDepositTabsActive === index
                      ? "bg-[#3D424D] rounded-[64px]"
                      : ""
                  }`}
                  onClick={() => setVerifyDepositTabsActive(index)}
                >
                  <p
                    className={`text-[12px] md:text-[16px] font-[700] whitespace-nowrap ${
                      verifyDepositTabsActive === index
                        ? "text-[#fff]"
                        : "text-[#ccc]"
                    }`}
                  >
                    {tab.title}
                  </p>
                  <p className="text-[#999] text-[10px] md:text-[12px] text-center font-[400] whitespace-nowrap">
                    {tab.desc}
                  </p>
                </div>
              ))}
            </div>

            {verifyDepositTabsActive === 0 && (
              <div className="mt-[1rem]">
                <p className="text-[1rem] text-[#A0A5AD]">
                  Enter your deposit tx hash, and we'll automatically select the
                  network for you.
                </p>

                <div className="mt-[1rem] flex flex-wrap items-center gap-6">
                  <Select
                    className="max-w-[16rem]"
                    items={verifyFromList.map((item) => ({
                      label: item.label,
                      icon: item.icon,
                      chainId: item.chainId,
                    }))}
                    value={selectedChainId}
                    selectedKeys={[selectedChainId]}
                    // size="xl"
                    renderValue={(items) => {
                      return items.map((item) => (
                        <div key={item.key} className="flex items-center gap-2">
                          <Avatar
                            className="flex-shrink-0"
                            size="sm"
                            src={item.data?.icon}
                          />
                          <span>{item.data?.label}</span>
                        </div>
                      ));
                    }}
                    onChange={(e) => setSelectedChainId(e.target.value)}
                  >
                    {(chain) => (
                      <SelectItem key={chain.chainId} value={chain.chainId}>
                        <div className="flex gap-2 items-center">
                          <Avatar
                            className="flex-shrink-0"
                            size="sm"
                            src={chain.icon}
                          />
                          <span className="text-small">{chain.label}</span>
                        </div>
                      </SelectItem>
                    )}
                  </Select>

                  <Input
                    className="max-w-[100%]"
                    variant="underlined"
                    placeholder="Please enter your tx hash"
                    value={depositTxHash}
                    onChange={(e) => setDepositTxHash(e.target.value)}
                  />
                </div>

                <div className="mt-[1rem] w-full">
                  <Button
                    className="gradient-btn w-full rounded-full mt-5"
                    onClick={verifyDepositHash}
                    disabled={
                      isReVerifyDeposit || accessRpcLoading || !depositTxHash
                    }
                    isLoading={isReVerifyDeposit || accessRpcLoading}
                  >
                    {isReVerifyDeposit ? "Re-verify(in 60s)" : "Verify"}
                  </Button>

                  {depositStatus === VerifyResult.SUCCESS && (
                    <p className="text-[#03D498] py-4 text-[1rem]">
                      Your deposit is still being processed. The estimated
                      remaining wait time is approximately x minutes.
                    </p>
                  )}
                  {depositStatus === VerifyResult.FAILED && (
                    <p className="text-[#C57D10] py-4 text-[1rem]">
                      This Tx Hash does not meet the requirements. Please check
                      the deposit amount, network, wallet address, and the Tx
                      Hash itself.
                    </p>
                  )}
                </div>
              </div>
            )}

            {verifyDepositTabsActive === 1 && (
              <div className="mt-[1rem]">
                <p className="text-[#A0A5AD] text-[1rem] font-[500]">
                  Currently, the Aggregation Parade is open to users who deposit
                  more than 0.1 ETH or an equivalent amount of assets in single
                  tx through Owlto, Symbiosis, or Meson.{" "}
                  {/* <a href="" target="_blank" className="text-[#03D498]">
                    Read More
                  </a> */}
                </p>
                <p
                  className="mt-[1.5rem] pb-[0.8rem] text-[#fff] text-[14px] font-[500]"
                  style={{
                    borderBottom: "1px solid #fff",
                  }}
                >
                  Connected Wallet ({showAccount(address)})
                </p>

                <div className="mt-[1rem] w-full">
                  <Button
                    className="gradient-btn w-full rounded-full mt-5"
                    onClick={verifyDepositViaThirdParty}
                    isLoading={verifyDepositThirdLoading}
                  >
                    Verify
                  </Button>

                  {depositThirdStatus === VerifyResult.SUCCESS && (
                    <p className="text-[#03D498] py-4 text-[1rem]">
                      Your deposit is still being processed. The estimated
                      remaining wait time is approximately x minutes.
                    </p>
                  )}
                  {depositThirdStatus === VerifyResult.FAILED && (
                    <p className="text-[#C57D10] py-4 text-[1rem]">
                      {verifyDepositError
                        ? verifyDepositError
                        : "This address does not meet the requirements. Please make sure you have completed a single transaction through supported third-party bridge and the bridged amount exceeds 0.1 ETH, 500 USDT, or 500 USDC."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </BgBox>
  );
}
