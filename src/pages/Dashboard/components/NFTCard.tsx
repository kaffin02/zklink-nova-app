import {
  Button,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import styled from "styled-components";
import { CardBox } from "@/styles/common";
import { NFT_MARKET_URL } from "@/constants";
import { useState, useEffect, useRef } from "react";
import DrawAnimation from "@/components/DrawAnimation";
import useSBTNFT from "@/hooks/useNFT";
import useNovaNFT from "@/hooks/useNovaNFT";
import { getRemainMysteryboxDrawCount } from "@/api";
import { useAccount } from "wagmi";
const NftBox = styled.div`
  .nft-left {
    width: 60%;
    padding: 24px;
    .nft-chip:nth-child(3n) {
      margin-right: 0;
    }
    .nft-left-title {
      color: #fff;
      font-family: Satoshi;
      font-size: 16px;
      font-style: normal;
      font-weight: 700;
      line-height: 24px; /* 150% */
      letter-spacing: 0.96px;
    }
    .nft-left-sub-title {
      color: #919192;
      font-family: Satoshi;
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      letter-spacing: 0.96px;
    }
    .nft-chip {
      border-radius: 16px;
      backdrop-filter: blur(15.800000190734863px);
    }
    .nft-info {
      width: 170px;
      flex-shrink: 0;

      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 16px;
      margin-bottom: 24px;
      .nft-name {
        text-align: center;
        font-family: Satoshi;
        font-size: 14px;
        font-style: normal;
        font-weight: 700;
        line-height: 22px; /* 157.143% */
        background: linear-gradient(90deg, #48ecae 0%, #49ced7 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
      }
      .nft-balance {
        color: #fff;
        font-family: Satoshi;
        font-size: 16px;
        font-style: normal;
        font-weight: 700;
        line-height: 24px; /* 150% */
        letter-spacing: 0.96px;
      }
    }
  }
  .nft-right {
    width: 40%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;
//prize id --> tokenId of point booster NFT, 8 for lynks NFT
const PRIzE_ID_NFT_MAP = {
  1: 3, // NVA-BOOSTER-SBT-3
  2: 4,
  3: 100,
  4: 300,
  5: 500,
  6: 1000,
  7: 2000,
};

const ALL_NFTS = [
  { img: "trademark-1.png", name: "Trade mark", balance: 0 },
  { img: "trademark-2.png", name: "Trade mark", balance: 0 },
  { img: "trademark-3.png", name: "Trade mark", balance: 0 },
  { img: "trademark-4.png", name: "Trade mark", balance: 0 },

  { img: "point-booster-1.png", name: "Point Booster 1", balance: 0 },
  { img: "point-booster-2.png", name: "Point Booster 2", balance: 0 },
  { img: "point-booster-3.png", name: "Point Booster 3", balance: 0 },
  { img: "point-booster-4.png", name: "Point Booster 4", balance: 0 },
  { img: "point-booster-5.png", name: "Point Booster 5", balance: 0 },
  { img: "point-booster-6.png", name: "Point Booster 6", balance: 0 },
  { img: "point-booster-7.png", name: "Point Booster 7", balance: 0 },

  { img: "ENTP-LYNK.png", name: "ENTP-LYNK", balance: 0 },
  { img: "ISTP-LYNK.png", name: "LSTP-LYNK", balance: 0 },
  { img: "INFJ-LYNK.png", name: "INFJ-LYNK", balance: 0 },
  { img: "ESFJ-LYNK.png", name: "ESFJ-LYNK", balance: 0 },
];
export default function NFTCard() {
  const openBoxModal = useDisclosure();
  const mintBoxModal = useDisclosure();
  const [remainMintCount, setRemainMintCount] = useState(0);
  const [minting, setMinting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [boxId, setBoxId] = useState<number | null>(null);
  const drawRef = useRef<{ start: (target: number) => void }>();
  const [drawing, setDrawing] = useState(false);
  const { nft: sbtNFT } = useSBTNFT();
  const { trademarkNFT, boosterNFT, lynksNFT, getLynksNFT, sendMysteryMintTx } = useNovaNFT();
  const { address } = useAccount();
  const [allNFTs, setAllNFTs] =
    useState<{ img: string; name: string; balance: number }[]>(ALL_NFTS);

  const onOpen = () => {
    openBoxModal.onOpen();
  };
  const onMint = () => {
    mintBoxModal.onOpen();
  };

  useEffect(() => {
    //fetch box count remain
    if (address) {
      getRemainMysteryboxDrawCount(address).then((res) => {
        const remainNumber = res.result;
        setRemainMintCount(remainNumber);
      });
    }
  }, [address]);

  useEffect(() => {
    (async () => {
      if (!address || !trademarkNFT || !boosterNFT || !lynksNFT) {
        return;
      }
      const nfts = [];
      const trademarkBalances = await Promise.all(
        [1, 2, 3, 4].map((item) => trademarkNFT.read.balanceOf([address, item]))
      );
      console.log("trademarkBalances: ", trademarkBalances);
      for (let i = 0; i < 4; i++) {
        nfts.push({ ...ALL_NFTS[i], balance: Number(trademarkBalances[i]) });
      }
      const boosterBalances = await Promise.all(
        [1, 2, 3, 4, 5, 6, 7].map((item: number) =>
          boosterNFT.read.balanceOf([address, item])
        )
      );
      console.log("boosterBalances: ", boosterBalances);
      for (let i = 0; i < 7; i++) {
        nfts.push({ ...ALL_NFTS[i + 4], balance: Number(boosterBalances[i]) });
      }
      const lynksBalances = await getLynksNFT(address);
      console.log("lynksBalances: ", lynksBalances);
      setAllNFTs(nfts);
    })();
  }, [address, boosterNFT, lynksNFT, trademarkNFT, getLynksNFT]);
  const onMintSubmit = () => {
    try {
      setMinting(true);
      // 1. burn mystery box nft;2.call api to get prize and params; 3. call booster/lynx contract to mint
    } catch (e) {
      console.error(e);
    } finally {
      setMinting(false);
    }
  };

  const onOpenSubmit = () => {
    try {
      setOpening(true);
      setDrawing(true);
      drawRef.current?.start(2);
    } catch (e) {
      console.error(e);
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <NftBox className="flex justify-between  rounded-lg mt-8">
        <CardBox className="nft-left">
          <div className="flex justify-between">
            <div>
              <p className="nft-left-title">Nova NFTs</p>
              <p className="nft-left-sub-title">
                Invite to earn more pieces and upgrade your Nova Char
              </p>
            </div>
            <Button className="gradient-btn">Buy</Button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {allNFTs.map((item, index) => (
              <div className="nft-chip relative   w-[170px] " key={index}>
                <img src={`/img/img-${item.img}`} alt="" />
                {/* <div className='relative bg-slate-50 h-24 w-8/12 m-auto'> */}
                <div className="nft-info">
                  <span className="nft-name">{item.name}</span>
                  <span className="nft-balance">x{item.balance}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBox>

        <CardBox className="nft-right ml-10">
          <div className="text-xl flex items-center mb-8">
            <span>Mystery Box</span>
            <img
              src="/img/icon-tips-white.png"
              alt=""
              className="w-[14px] h-[14px] ml-1"
            />
          </div>
          <div className=" w-[384px] h-[300px] mb-8">
            <img
              src="/img/img-mystery-box.png"
              className="h-[100%] mx-auto object-contain"
            />
          </div>
          <Button className="gradient-btn mb-2 w-full" onPress={onOpen}>
            Open Your Box
          </Button>
          <Button className="gradient-btn mb-2 w-full" onPress={onMint}>
            Mint Your Box ({remainMintCount})
          </Button>
          <Button
            className="gradient-btn  w-full"
            onPress={() => window.open(NFT_MARKET_URL, "_blank")}
          >
            Trade in Alienswap
          </Button>
        </CardBox>
      </NftBox>

      <Modal
        classNames={{ closeButton: "text-[1.5rem]" }}
        size="xl"
        isOpen={openBoxModal.isOpen}
        onOpenChange={openBoxModal.onOpenChange}
      >
        <ModalContent className="mb-[5.75rem]">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Open the Mystery box
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col items-center ">
                  <DrawAnimation
                    type="MysteryBox"
                    ref={drawRef}
                    onDrawEnd={() => {
                      setDrawing(false);
                    }}
                    sbtNFT={sbtNFT}
                  />
                  <p className="text-[#fff] text-[24px] font-normal my-2 text-center font-satoshi">
                    Mystery Box Left:{" "}
                    <span className="text-[#43E3B5]">{remainMintCount}</span>
                  </p>
                  <p className="text-center text-[#C0C0C0] mb-4">
                    You will have a chance to randomly mint some booster NFT.
                    However, you must mint your booster NFT before you can enter
                    another lucky draw.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <div className="w-full">
                  <div>
                    <Button
                      className="gradient-btn w-full h-[58px] py-[1rem] flex justify-center items-center gap-[0.38rem] text-[1.25rem]  mb-4"
                      onPress={onOpenSubmit}
                      isLoading={opening || drawing}
                    >
                      {opening || drawing ? "Opening" : "Open"}
                    </Button>
                    <Button
                      className="gradient-btn w-full h-[58px] py-[1rem] flex justify-center items-center gap-[0.38rem] text-[1.25rem]  mb-4"
                      onPress={onOpenSubmit}
                      isLoading={opening || drawing}
                    >
                      Mint
                    </Button>
                  </div>

                  <Button
                    className="secondary-btn w-full h-[58px] py-[1rem] flex justify-center items-center gap-[0.38rem] text-[1.25rem]  "
                    onPress={() => {
                      window.open(NFT_MARKET_URL, "_blacnk");
                    }}
                  >
                    Buy from Alienswap
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal
        classNames={{ closeButton: "text-[1.5rem]" }}
        size="md"
        isOpen={mintBoxModal.isOpen}
        onOpenChange={mintBoxModal.onOpenChange}
      >
        <ModalContent className="mb-[5.75rem]">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Mint the Mystery box
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col items-center ">
                  <img
                    src="/img/img-mystery-box-temp.png"
                    className="w-[330px] h-[330px] mb-6"
                  />
                  <p className="text-[24px] font-satoshi ">
                    Minting oppertunities:{" "}
                    <span className="text-green">{remainMintCount}</span>
                  </p>
                  <p className="text-gray text-[16px] font-normal">
                    Congratulation, now you can mint Mystery Box{" "}
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <div className="w-full">
                  <Button
                    className="w-full gradient-btn"
                    onPress={onClose}
                    isLoading={minting}
                  >
                    {minting ? "Minting" : "Mint"}
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
