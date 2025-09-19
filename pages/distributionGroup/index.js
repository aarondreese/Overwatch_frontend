import Head from "next/head";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  listDistributionGroups,
  updateDistributionGroup,
  deleteDistributionGroup,
} from "../api/DistributionGroups";
import {
  listSourceSystems,
  updateDistributionGroupMember,
  addDistributionGroupMember,
  deleteDistributionGroupMember,
} from "../api/DistributionGroupMembers";

import { useForm } from "react-hook-form";

import {
  PencilSquareIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

export default function DistributionGroup() {
  const [distributionGroups, setDistributionGroups] = useState([]);
  const [selectedGroupID, setSelectedGroupID] = useState(-5);
  const [members, setMembers] = useState([]);
  const [selectedMemberID, setSelectedMemberID] = useState(-99);
  const [groupModalIsOpen, setGroupModalIsOpen] = useState(false);
  const [memberModalIsOpen, setMemberModalIsOpen] = useState(false);

  const fetchdata = useCallback(async () => {
    const data = await listDistributionGroups();
    setDistributionGroups((distributionGroups) => data);
  }, []);

  const initialLoad = useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  async function handleActiveToggle(member_id) {
    const dto = selectedGroup.members.filter((m) => m.id == member_id)[0];
    dto.isActive = !dto.isActive;
    const newDistributionGroups = await updateDistributionGroupMember(dto);
    fetchdata();
  }

  async function handleDeleteGroup(groupID) {
    const res = await deleteDistributionGroup(groupID);
    await fetchdata();
    setGroupModalIsOpen(false);
  }

  async function handleDeleteMember(memberID) {
    const res = await deleteDistributionGroupMember(memberID);
    await fetchdata();
    setMemberModalIsOpen(false);
  }

  const onSubmitDistributionGroup = async (data) => {
    console.log("Submitting data: ", data);
    const res = await updateDistributionGroup(data);
    await fetchdata();
    setGroupModalIsOpen(false);
  };

  const onSubmitDistributionGroupMember = async (data) => {
    console.log("Submitting Member data: ", data);
    let res;
    if (data.MemberID && data.MemberID > 0) {
      res = await updateDistributionGroupMember(data);
    } else {
      data.GroupID = selectedGroupID;
      res = await addDistributionGroupMember(data);
    }
    await fetchdata();
    setMemberModalIsOpen(false);
  };

  /*Group Modal Form*/
  const {
    register: registerGroup,
    handleSubmit: handleSubmitDistributionGroup,
    reset: resetGroup,
    formState: { errors: errorsGroup },
  } = useForm();

  const resetDistributionGroupFormData = useCallback(
    (group) => {
      console.log("in resetDistributionGroupFormData: ", group);
      if (!group.hasOwnProperty("id")) {
        console.log("no ID property!");
        resetGroup({
          GroupID: -1,
          GroupName: null,
          EmailAddress: null,
        });
      } else {
        resetGroup({
          GroupID: group.id,
          GroupName: group.groupName ? group.groupName : null,
          EmailAddress: group.emailAddress ? group.emailAddress : null,
        });
      }
    },
    [resetGroup]
  );

  const selectedGroup = useMemo(() => {
    console.log("in selectedGroup", distributionGroups, selectedGroupID);
    const group = distributionGroups.filter((dg) => dg.id === selectedGroupID);
    if (group?.length > 0) {
      setMembers(group[0].members);
      resetDistributionGroupFormData(group[0]);
      return group[0];
    } else {
      resetDistributionGroupFormData({});
      return null;
    }
  }, [selectedGroupID, distributionGroups, resetDistributionGroupFormData]);

  /*Member Modal Form*/
  const {
    register: registerMember,
    handleSubmit: handleSubmitDistributionGroupMember,
    reset: resetMember,
    formState: { errors: errorsMember },
  } = useForm();

  const resetDistributionGroupMemberFormData = useCallback(
    (member) => {
      console.log("in resetDistributionGroupMemberFormData: ", member);
      if (!member.hasOwnProperty("id")) {
        console.log("no ID property!");
        resetMember({
          MemberID: -1,
          EmailAddress: null,
        });
      } else {
        resetMember({
          MemberID: member.id,
          EmailAddress: member.emailAddress ? member.emailAddress : null,
        });
      }
    },
    [resetMember]
  );

  const selectedMember = useMemo(() => {
    console.log("in selectedMember", selectedGroup, selectedMemberID);
    const member = selectedGroup?.members?.filter(
      (m) => m.id === selectedMemberID
    );
    if (member?.length > 0) {
      resetDistributionGroupMemberFormData(member[0]);
      return member[0];
    } else {
      resetDistributionGroupMemberFormData({});
      return null;
    }
  }, [selectedMemberID, selectedGroup, resetDistributionGroupMemberFormData]);

  return (
    <>
      <Head>
        <title>Distribution Groups</title>
        <meta name="description" content="Manage distribution groups" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Distribution Groups
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Distribution Groups Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Groups</h2>
                  <button
                    onClick={() => {
                      setSelectedGroupID(-5);
                      setGroupModalIsOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
                  >
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Add Group
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {distributionGroups.map((group) => (
                      <tr
                        key={group.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedGroupID === group.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedGroupID(group.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {group.groupName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {group.emailAddress || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {group.members?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGroupID(group.id);
                                setGroupModalIsOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">
                    Members {selectedGroup ? `- ${selectedGroup.groupName}` : ""}
                  </h2>
                  {selectedGroup && (
                    <button
                      onClick={() => {
                        setSelectedMemberID(-99);
                        setMemberModalIsOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
                    >
                      <PlusCircleIcon className="h-4 w-4 mr-2" />
                      Add Member
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                {selectedGroup ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr
                          key={member.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedMemberID === member.id ? "bg-green-50" : ""
                          }`}
                          onClick={() => setSelectedMemberID(member.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.emailAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                member.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {member.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActiveToggle(member.id);
                                }}
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  member.isActive
                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                    : "bg-green-100 text-green-800 hover:bg-green-200"
                                }`}
                              >
                                {member.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemberID(member.id);
                                  setMemberModalIsOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMember(member.id);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <MinusCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      Select a group to view its members
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Group Modal */}
        <Modal
          isOpen={groupModalIsOpen}
          onClose={() => setGroupModalIsOpen(false)}
          title={selectedGroupID > 0 ? "Edit Group" : "Add New Group"}
        >
          <form
            onSubmit={handleSubmitDistributionGroup(onSubmitDistributionGroup)}
            className="space-y-4"
          >
            <input
              {...registerGroup("GroupID")}
              type="hidden"
              defaultValue={selectedGroupID}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                {...registerGroup("GroupName", { required: true })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
              />
              {errorsGroup.GroupName && (
                <p className="text-red-500 text-sm mt-1">Group name is required</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                {...registerGroup("EmailAddress")}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {selectedGroupID > 0 ? "Update" : "Create"} Group
              </button>
              <button
                type="button"
                onClick={() => setGroupModalIsOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Member Modal */}
        <Modal
          isOpen={memberModalIsOpen}
          onClose={() => setMemberModalIsOpen(false)}
          title={selectedMemberID > 0 ? "Edit Member" : "Add New Member"}
        >
          <form
            onSubmit={handleSubmitDistributionGroupMember(
              onSubmitDistributionGroupMember
            )}
            className="space-y-4"
          >
            <input
              {...registerMember("MemberID")}
              type="hidden"
              defaultValue={selectedMemberID}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                {...registerMember("EmailAddress", { required: true })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter email address"
              />
              {errorsMember.EmailAddress && (
                <p className="text-red-500 text-sm mt-1">Email address is required</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {selectedMemberID > 0 ? "Update" : "Add"} Member
              </button>
              <button
                type="button"
                onClick={() => setMemberModalIsOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

// Modal Component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
