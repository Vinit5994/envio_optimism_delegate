import assert from "assert";
import { 
  TestHelpers,
  GovernanceToken_Approval
} from "generated";
const { MockDb, GovernanceToken } = TestHelpers;

describe("GovernanceToken contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for GovernanceToken contract Approval event
  const event = GovernanceToken.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("GovernanceToken_Approval is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await GovernanceToken.Approval.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualGovernanceTokenApproval = mockDbUpdated.entities.GovernanceToken_Approval.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedGovernanceTokenApproval: GovernanceToken_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualGovernanceTokenApproval, expectedGovernanceTokenApproval, "Actual GovernanceTokenApproval should be the same as the expectedGovernanceTokenApproval");
  });
});
