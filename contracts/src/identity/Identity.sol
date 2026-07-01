// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract DroidIdentity is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("DroidIdentity", "DrID") Ownable(msg.sender) {}

    function mint(address to, string memory uri) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
}
