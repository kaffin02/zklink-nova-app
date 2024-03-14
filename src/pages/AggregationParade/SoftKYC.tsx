import {
  checkInviteCode,
  getInvite,
  getTxByTxHash,
  registerAccount,
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
import {
  getProviderWithRpcUrl,
  getRandomNumber,
  postData,
  showAccount,
} from "@/utils";
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
  useDisclosure,
} from "@nextui-org/react";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import qs from "qs";
import { useEffect, useState } from "react";
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

// const verifyFromList = [
//   ...fromList,
//   IS_MAINNET ? NOVA_NETWORK : NOVA_GOERLI_NETWORK,
// ];

const verifyFromList = [...fromList];
const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID;
const twitterCallbackURL = import.meta.env.VITE_TWITTER_CALLBACK_URL;

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
`;

const TitleText = styled.h4`
  color: #c2e2ff;
  text-align: center;
  font-family: Satoshi;
  font-size: 2.5rem;
  font-style: normal;
  font-weight: 900;
  line-height: 2.5rem; /* 100% */
  letter-spacing: -0.03125rem;
`;
const SubTitleText = styled.p`
  color: #c6d3dd;
  text-align: center;
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
  const web3Modal = useWeb3Modal();
  const verifyDepositModal = useDisclosure();
  const [searchParams, setSearchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const {
    signature,
    inviteCode,
    depositTx,
    depositChainId,
    isCheckedInviteCode,
  } = useSelector((store: RootState) => store.airdrop);

  const [inviteCodeValue, setInviteCodeValue] = useState(inviteCode || "");
  const [isInviteCodeLoading, setIsInviteCodeLoading] = useState(false);
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
      console.log(error);
      // setIsInviteCodeLoading(false);
      dispatch(setIsCheckedInviteCode(false));
    } finally {
      setIsInviteCodeLoading(false);
    }
  };

  const getTwitterClientId = () => {
    let clientId = "";
    if (clientIds.length > 1) {
      const index = getRandomNumber(0, clientIds.length - 1);
      clientId = clientIds[index];
    } else {
      clientId = clientIds[0];
    }
    return clientId;
  };

  const clientIds = twitterClientId.split(",");

  const handleConnectTwitter = () => {
    setTwitterLoading(true);
    const clientId = getTwitterClientId();
    const params = {
      response_type: "code",
      client_id: clientId,
      redirect_uri: twitterCallbackURL,
      // client_id: "RTUyVmlpTzFjTFhWWVB4b2tyb0k6MTpjaQ",
      // redirect_uri: "http://localhost:3000/aggregation-parade",
      scope: "tweet.read%20users.read%20follows.read%20follows.write",
      state: "state",
      code_challenge: "challenge",
      code_challenge_method: "plain",
    };
    const url = new URL(`https://twitter.com/i/oauth2/authorize`);
    url.search = qs.stringify(params, { encode: false });

    window.location.href = url.href;
  };

  const handleConnectAndSign = async () => {
    if (!isConnected || !address) {
      setIsHandleSign(true);
      web3Modal.open({ view: "Connect" });
      return;
    }
    setSignLoading(true);

    await signMessage(
      {
        message: SIGN_MESSAGE,
      },
      {
        onSuccess(data, variables, context) {
          console.log(data, variables, context);
          console.log("signature", data);
          dispatch(setSignature(data));
          dispatch(setSignatureAddress(address));
          setSignLoading(false);
          setIsHandleSign(false);
        },
        onError(error, variables, context) {
          console.log(error, variables, context);
          setSignLoading(false);

          toast.error("User reject signature. Try again.");
        },
      }
    );
  };
  useEffect(() => {
    console.log("is Handle Sign", isConnected, isHandleSign);
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
          console.log(e);
        } finally {
          setAccessRpcLoading(false);
        }
      }
    })();
  }, [depositTxHash]);

  useEffect(() => {
    console.log("signLoading", signLoading);
  }, [signLoading]);

  const toastTwitterError = (text?: string) => {
    toast.error(text || "Could not connect to Twitter. Try again.");
    setTwitterLoading(false);
  };

  const getTwitterAPI = async (code: string) => {
    const clientId = getTwitterClientId();
    setTwitterLoading(true);
    postData("/twitter/2/oauth2/token", {
      code,
      grant_type: "authorization_code",
      // client_id: "RTUyVmlpTzFjTFhWWVB4b2tyb0k6MTpjaQ",
      // redirect_uri: "http://localhost:3000/aggregation-parade",
      client_id: clientId,
      redirect_uri: twitterCallbackURL,
      code_verifier: "challenge",
    })
      .then((res) => {
        console.log(res);

        if (res?.error) {
          toastTwitterError();
          return;
        }

        const { access_token } = res;

        console.log(access_token);
        if (access_token && access_token !== "") {
          fetch("/twitter/2/users/me", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access_token}`,
            },
          })
            .then(async (res: any) => {
              let { data } = await res.json();
              console.log(data);
              console.log(data.username);
              // dispatch(setTwitter(data));

              if (data?.username) {
                setTwitterLoading(false);
                setTwitterAccessToken(access_token);
              } else {
                toastTwitterError();
              }

              // TODO: valid twitter ?
              // if (data?.username) {
              //   console.log(data?.username);
              //   const res = await validTwitter(data?.username, address);

              //   if (res.result) {
              //     setTwitterLoading(false);
              //     setTwitterAccessToken(access_token);
              //     console.log("twitter account", access_token);
              //     // setSearchParams("");
              //   } else {
              //     toastTwitterError(
              //       "Sorry, this Twitter account has already been bound."
              //     );
              //   }
              // }
            })
            .catch(() => {
              toastTwitterError();
            });
        }
      })
      .catch((error) => {
        console.log(error);
        toastTwitterError;
      });
  };

  /**
   * TODO: Verify deposit hash
   */
  const verifyDepositHash = async () => {
    setDepositStatus("");
    setIsReVerifyDeposit(true);
    console.log(selectedChainId, depositTxHash);
    try {
      const res = await getTxByTxHash({
        txHash: depositTxHash,
        chainId: selectedChainId,
        address,
      });
      // TODO: response will return a field (as status: "PENDING") to show process ...
      console.log("verifyDepositHash", res);
      if (res?.isValid) {
        setDepositStatus(VerifyResult.SUCCESS);
        dispatch(setDepositTx(depositTxHash));
        dispatch(setDepositChainId(selectedChainId));
        verifyDepositModal.onClose();
      } else {
        setDepositStatus(VerifyResult.FAILED);
      }
    } catch (e) {
      console.log(e);
      setDepositStatus(VerifyResult.FAILED);
    } finally {
      setIsReVerifyDeposit(false);
    }
  };

  const getInviteFunc = async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      const res = await getInvite(address);
      console.log("getInviteFunc", res);
      if (res?.result) {
        setTimeout(() => {
          setIsLoading(false);
          dispatch(setInvite(res?.result));
        }, 1000);
      }
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      handleSubmitError();
    }
  };

  // TODO: Submit user bind form
  const handleSubmitError = (message?: string) => {
    toast.error(
      message
        ? message
        : "Verification failed. Please recheck your invite code, wallet-tx hash relationship, and ensure your Twitter account is not binded to another address."
    );
    dispatch(setIsCheckedInviteCode(false));
    dispatch(setInviteCode(""));
    dispatch(setDepositTx(""));
    setTwitterAccessToken("");
    dispatch(setSignature(""));

    // dispatch(setInvite(null));
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
      const res = await registerAccount({
        address: address,
        code: inviteCodeValue,
        siganture: signature,
        accessToken: twitterAccessToken,
        chainId: depositChainId,
        txHash: depositTx,
      });

      console.log("handleSubmit", res);

      if (+res?.status === 0) {
        getInviteFunc();
      } else {
        handleSubmitError(res?.message);
      }
    } catch (error: any) {
      // TODO: error type
      handleSubmitError(error?.message);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const flag = searchParams.get("flag");

    // if after deposit to link here, show verify tx modal
    if (flag && address) {
      const txs = txhashes[address];

      console.log("txhashes", txhashes[address]);
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
      toast.error("Could not connect to Twitter. Try again.");
      return;
    }

    if (code) {
      getTwitterAPI(code);
      setSearchParams("");
    }
  }, [searchParams]);

  // const checkInviteCode = async (code: string) => {

  // };

  // /**
  //  * Check: Invite code
  //  */
  // useEffect(() => {
  //   if (inviteCode) {
  //     checkInviteCode(inviteCode);
  //   }
  // }, []);

  useEffect(() => {
    if (
      validInviteCode(inviteCodeValue) &&
      twitterAccessToken &&
      depositTx &&
      isConnected &&
      signature
    ) {
      setSubmitStatus(true);
    }
  }, [inviteCodeValue, twitterAccessToken, depositTx, isConnected, signature]);

  useEffect(() => {
    if (!inviteCodeValue || inviteCodeValue?.length !== 6) {
      dispatch(setIsCheckedInviteCode(false));
    }
  }, [inviteCodeValue]);

  return (
    <BgBox>
      {isLoading && <Loading />}
      <div>
        {/* Title */}
        <div className="mt-[1rem]">
          <SubTitleText>YOU’RE ALMOST THERE</SubTitleText>
          <TitleText>To join the zkLink Aggregation Parade</TitleText>
        </div>

        <div className="mt-[3rem] mx-auto max-w-[720px]">
          {/* Setp 1: invite code */}
          <div className="flex justify-center gap-[0.5rem]">
            <CardBox className={`${isCheckedInviteCode ? "successed" : ""}`}>
              <StepNum>01</StepNum>
            </CardBox>
            <CardBox
              className={`flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                isCheckedInviteCode ? "successed" : ""
              }`}
            >
              <StepItem>
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
              </StepItem>

              <div className="flex items-center gap-[0.5rem]">
                <InviteInput
                  type="text"
                  placeholder="Invite Code"
                  value={inviteCodeValue}
                  className={`max-w-[120px] ${
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
            <CardBox className={signature ? "successed" : ""}>
              <StepNum>02</StepNum>
            </CardBox>
            <CardBox
              className={`flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                signature ? "successed" : ""
              }`}
            >
              <StepItem>
                <p className="step-title">Connect your wallet</p>
                <p className="step-sub-title mt-[0.25rem]">
                  Prove your ownership of the address
                </p>
              </StepItem>
              <div className="flex items-center gap-[0.5rem]">
                <StepItem>
                  {isConnected && (
                    <span className="step-title">{showAccount(address)}</span>
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
            <CardBox className={`${depositTx ? "successed" : ""}`}>
              <StepNum>03</StepNum>
            </CardBox>
            <CardBox
              className={`flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                depositTx ? "successed" : ""
              }`}
            >
              <StepItem>
                <p className="step-title">Bridge and Earn</p>
                <p className="step-sub-title mt-[0.25rem]">
                  {"Minimum deposit amount ≥ 0.1 ETH or equivalent"}
                </p>
              </StepItem>
              <div className="flex items-center gap-[0.5rem]">
                <Button
                  className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem] flex items-center gap-[0.5rem]"
                  onClick={() => {
                    navigate("/bridge");
                  }}
                >
                  <span className="ml-[0.5rem]">Bridge</span>
                </Button>
                <Button
                  className="gradient-btn px-[1rem] py-[0.5rem] text-[1rem] flex items-center gap-[0.5rem]"
                  disabled={Boolean(depositTx)}
                  onClick={() => {
                    verifyDepositModal.onOpen();
                  }}
                >
                  <span className="ml-[0.5rem]">Verify</span>
                </Button>
              </div>
            </CardBox>
          </div>

          {/* Step 4: connect twitter */}
          <div className="flex justify-center gap-[0.5rem] mt-[1rem]">
            <CardBox className={`${twitterAccessToken ? "successed" : ""}`}>
              <StepNum>04</StepNum>
            </CardBox>
            <CardBox
              className={`flex justify-between items-center px-[1.5rem] py-[1rem] w-[40.125rem] h-[6.25rem] ${
                twitterAccessToken ? "successed" : ""
              }`}
            >
              <StepItem>
                <p className="step-title">Connect Twitter</p>
                <p className="step-sub-title mt-[0.25rem]">
                  You can only bind your Twitter account with one wallet
                </p>
              </StepItem>
              <div>
                {twitterAccessToken ? (
                  <img
                    src="/img/icon-right.svg"
                    className="w-[1.5rem] h-[1.5rem]"
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
          </div>

          {/* Submit for user bind */}
          <div className="flex justify-center w-full px-[5rem] ">
            <Button
              className={`gradient-btn mx-auto mt-[1rem] py-[2rem] w-full text-center`}
              disabled={!submitStatus}
              onClick={handleSubmit}
            >
              <StepItem>
                <p className="step-title">
                  Participate zkLink Aggregation Parade
                </p>
              </StepItem>
            </Button>
          </div>
        </div>
      </div>

      {/* Total tvl */}
      <div className="flex flex-col justify-center items-center w-full py-[2.5rem]">
        <FooterTvlText className="mb-[0.5rem] text-center">TVL</FooterTvlText>
        <TotalTvlCard />
      </div>

      {/* Verify deposit modal */}
      <Modal
        classNames={{ closeButton: "text-[1.5rem]" }}
        style={{ minHeight: "14rem" }}
        size="xl"
        isOpen={verifyDepositModal.isOpen}
        onOpenChange={verifyDepositModal.onOpenChange}
      >
        <ModalContent className="p-2">
          <ModalHeader>Verify your deposit</ModalHeader>
          <ModalBody>
            <p className="text-[1rem] text-[#A0A5AD]">
              Enter your deposit transaction hash and select the network on
              which you made the deposit.
            </p>

            <div className="flex items-center gap-6">
              <Select
                className="max-w-[9.5rem]"
                items={verifyFromList.map((item) => ({
                  label: item.label,
                  icon: item.icon,
                  chainId: item.chainId,
                }))}
                value={selectedChainId}
                selectedKeys={[selectedChainId]}
                size="sm"
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
                variant="underlined"
                placeholder="Please enter your tx hash"
                value={depositTxHash}
                onChange={(e) => setDepositTxHash(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="w-full">
              <Button
                className="gradient-btn w-full rounded-full mt-5"
                onClick={verifyDepositHash}
                disabled={isReVerifyDeposit || accessRpcLoading}
                isLoading={isReVerifyDeposit || accessRpcLoading}
              >
                {isReVerifyDeposit ? "Re-verify(in 60s)" : "Verify"}
              </Button>

              {depositStatus === VerifyResult.SUCCESS && (
                <p className="text-[#03D498] py-4 text-[1rem]">
                  Your deposit is still being processed. The estimated remaining
                  wait time is approximately x minutes.
                </p>
              )}
              {depositStatus === VerifyResult.FAILED && (
                <p className="text-[#C57D10] py-4 text-[1rem]">
                  This Tx Hash does not meet the requirements. Please check the
                  deposit amount, network, wallet address, and the Tx Hash
                  itself.
                </p>
              )}
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </BgBox>
  );
}