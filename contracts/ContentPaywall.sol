// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContentPaywall
 * @dev A smart contract for pay-to-unlock content on Rootstock
 * @author SocialFi Tutorial
 */

contract ContentPaywall {
    // ============ State Variables ============

    /// @notice Owner of the contract (content creator/platform)
    address public owner;

    /// @notice Mapping from contentId to price in wei (smallest unit of rBTC)
    mapping(string => uint256) public contentPrices;

    /// @notice Nested mapping: user address => contentId => hasAccess
    mapping(address => mapping(string => bool)) public userAccess;

    /// @notice Total funds collected in the contract
    uint256 public totalFunds;

    /// @notice Total number of unlocks (for analytics)
    uint256 public totalUnlocks;

    // ============ Events ============

    /**
     * @notice Emitted when a user unlocks content
     * @param user Address of the user who unlocked content
     * @param contentId Unique identifier of the content
     * @param price Amount paid in wei
     * @param timestamp Block timestamp when content was unlocked
     */
    event ContentUnlocked(
        address indexed user,
        string indexed contentId,
        uint256 price,
        uint256 timestamp
    );

    /**
     * @notice Emitted when the owner withdraws funds
     * @param owner Address of the contract owner
     * @param amount Amount withdrawn in wei
     * @param timestamp Block timestamp of withdrawal
     */
    event FundsWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Emitted when content price is set or updated
     * @param contentId Unique identifier of the content
     * @param price New price in wei
     * @param timestamp Block timestamp when price was set
     */
    event ContentPriceSet(
        string indexed contentId,
        uint256 price,
        uint256 timestamp
    );

    /**
     * @notice Emitted when ownership is transferred
     * @param previousOwner Address of the previous owner
     * @param newOwner Address of the new owner
     * @param timestamp Block timestamp of ownership transfer
     */
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    // ============ Modifiers ============

    /**
     * @notice Restricts function access to contract owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the contract and sets the deployer as owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender, block.timestamp);
    }

    // ============ Main Functions ============

    /**
     * @notice Allows users to unlock content by paying the required price
     * @param contentId Unique identifier of the content to unlock
     */
    function unlockContent(string memory contentId) external payable {
        // Get the price for this content
        uint256 price = contentPrices[contentId];

        // Ensure content exists and has a price set
        require(price > 0, "Content does not exist or price not set");

        // Ensure user hasn't already unlocked this content
        require(!userAccess[msg.sender][contentId], "Content already unlocked");

        // Ensure user sent exactly the right amount
        require(msg.value == price, "Incorrect payment amount");

        // Grant access to the user
        userAccess[msg.sender][contentId] = true;

        // Update total funds and unlock count
        totalFunds += msg.value;
        totalUnlocks += 1;

        // Emit event
        emit ContentUnlocked(msg.sender, contentId, price, block.timestamp);
    }

    /**
     * @notice Checks if a user has access to specific content
     * @param user Address of the user to check
     * @param contentId Unique identifier of the content
     * @return bool True if user has access, false otherwise
     */
    function hasAccess(
        address user,
        string memory contentId
    ) external view returns (bool) {
        return userAccess[user][contentId];
    }

    /**
     * @notice Gets the price of specific content
     * @param contentId Unique identifier of the content
     * @return uint256 Price in wei (returns 0 if not set)
     */
    function getContentPrice(
        string memory contentId
    ) external view returns (uint256) {
        return contentPrices[contentId];
    }

    // ============ Admin Functions ============

    /**
     * @notice Allows owner to set or update content prices
     * @param contentId Unique identifier of the content
     * @param price Price in wei (must be greater than 0)
     */
    function setContentPrice(
        string memory contentId,
        uint256 price
    ) external onlyOwner {
        require(price > 0, "Price must be greater than zero");

        contentPrices[contentId] = price;

        emit ContentPriceSet(contentId, price, block.timestamp);
    }

    /**
     * @notice Allows owner to set multiple content prices at once
     * @param contentIds Array of content identifiers
     * @param prices Array of prices (must match contentIds length)
     */
    function setMultipleContentPrices(
        string[] memory contentIds,
        uint256[] memory prices
    ) external onlyOwner {
        require(
            contentIds.length == prices.length,
            "Arrays must have same length"
        );

        for (uint256 i = 0; i < contentIds.length; i++) {
            require(prices[i] > 0, "All prices must be greater than zero");
            contentPrices[contentIds[i]] = prices[i];
            emit ContentPriceSet(contentIds[i], prices[i], block.timestamp);
        }
    }

    /**
     * @notice Allows owner to withdraw all collected funds
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        // Reset totalFunds counter
        totalFunds = 0;

        // Transfer all funds to owner
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner, balance, block.timestamp);
    }

    /**
     * @notice Allows owner to withdraw a specific amount of funds
     * @param amount Amount to withdraw in wei
     */
    function withdrawPartialFunds(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= amount, "Insufficient balance");

        // Update totalFunds counter
        if (totalFunds >= amount) {
            totalFunds -= amount;
        } else {
            totalFunds = 0;
        }

        // Transfer specified amount to owner
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner, amount, block.timestamp);
    }

    /**
     * @notice Allows owner to transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(
            newOwner != owner,
            "New owner must be different from current owner"
        );

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner, block.timestamp);
    }

    /**
     * @notice Allows owner to grant free access to specific content for a user
     * @param user Address of the user to grant access
     * @param contentId Unique identifier of the content
     */
    function grantFreeAccess(
        address user,
        string memory contentId
    ) external onlyOwner {
        require(user != address(0), "User cannot be zero address");
        require(!userAccess[user][contentId], "User already has access");

        userAccess[user][contentId] = true;
        totalUnlocks += 1;

        emit ContentUnlocked(user, contentId, 0, block.timestamp);
    }

    /**
     * @notice Allows owner to revoke access to specific content for a user
     *
     * @dev ⚠️  TRUST ASSUMPTION — NO REFUND MECHANISM
     *      This function removes a paying user's access without any on-chain
     *      refund. Refunds must be handled off-chain by the contract owner.
     *
     *      Intended use cases: moderation (piracy, ToS violations, fraud).
     *      NOT recommended as a routine admin operation.
     *
     *      For a production system consider:
     *        1. Removing revokeAccess entirely (true immutability), or
     *        2. Adding a proportional refund: payable(user).transfer(price), or
     *        3. Disclosing this risk prominently in your UI before payment.
     *
     * @param user      Address of the user to revoke access from
     * @param contentId Unique identifier of the content
     */
    function revokeAccess(
        address user,
        string memory contentId
    ) external onlyOwner {
        require(userAccess[user][contentId], "User doesn't have access");

        userAccess[user][contentId] = false;

        // Note: We intentionally do not emit a ContentUnlocked event here
        // to preserve the original unlock history in event logs.
    }

    // ============ View Functions ============

    /**
     * @notice Gets the current contract balance
     * @return uint256 Current balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Gets total number of content unlocks
     * @return uint256 Total unlock count
     */
    function getTotalUnlocks() external view returns (uint256) {
        return totalUnlocks;
    }

    /**
     * @notice Checks if multiple content items exist (have prices set)
     * @param contentIds Array of content identifiers to check
     * @return bool[] Array of booleans indicating existence
     */
    function checkMultipleContentExist(
        string[] memory contentIds
    ) external view returns (bool[] memory) {
        bool[] memory exists = new bool[](contentIds.length);

        for (uint256 i = 0; i < contentIds.length; i++) {
            exists[i] = contentPrices[contentIds[i]] > 0;
        }

        return exists;
    }

    /**
     * @notice Checks if a user has access to multiple content items
     * @param user Address of the user to check
     * @param contentIds Array of content identifiers to check
     * @return bool[] Array of booleans indicating access status
     */
    function checkMultipleAccess(
        address user,
        string[] memory contentIds
    ) external view returns (bool[] memory) {
        bool[] memory accessList = new bool[](contentIds.length);

        for (uint256 i = 0; i < contentIds.length; i++) {
            accessList[i] = userAccess[user][contentIds[i]];
        }

        return accessList;
    }

    // ============ Fallback Functions ============

    /**
     * @notice Fallback function to receive rBTC
     */
    receive() external payable {
        // Accept direct rBTC transfers (donations)
        totalFunds += msg.value;
    }

    /**
     * @notice Fallback function for unknown function calls
     */
    fallback() external payable {
        revert("Function does not exist");
    }
}
