
import { useState } from "react";
const data = [
  {
    groupName: 'Group A',
    members: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  },
  {
    groupName: 'Group B',
    members: [
      { id: 3, name: 'Cindy' },
      { id: 4, name: 'David' },
    ],
  },
];

export default function gpt() {
  const [groups, setGroups] = useState(data);

  return (
    <div className="App">
      {groups.map((group, index) => (
        <div key={index} className="mb-4">
          <details className="details details-reset w-full">
            <summary className="summary p-4 bg-blue-500 text-white cursor-pointer">
              {group.groupName}
            </summary>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((member) => (
                  <tr key={member.id} className="bg-blue-100 hover:bg-blue-200">
                    <td className="border px-4 py-2">{member.id}</td>
                    <td className="border px-4 py-2">{member.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ))}
    </div>
  );
}


