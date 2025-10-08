import Head from "next/head";
import { useEffect, useState, useMemo, useCallback } from "react";
import { set } from "react-hook-form";
import { getDomainByID } from "../../lib/client/domains";
import { useRouter } from "next/router";
import Link from "next/link";
import { PlusCircleIcon, MinusCircleIcon } from "@heroicons/react/24/solid";

export default function Domain() {
  const [domain, setDomain] = useState();
  const [openCheckID, setOpenCheckID] = useState(-1);

  const router = useRouter();
  const { id } = router.query;

  //const init = useCallback(() => setId(router.query.id));

  const fetchdata = useCallback(async () => {
    const data = await getDomainByID(id);
    setDomain(data);
  }, [id]);

  const initialLoad = useEffect(() => {
    if (!router.isReady) {
      return;
    }
    fetchdata();
  }, [id, fetchdata, router.isReady]);

  const updateOpenCheckID = function (id) {
    console.log("called updateOpenCheckID", id);
    if (id == openCheckID) {
      setOpenCheckID(-1);
    } else {
      setOpenCheckID(id);
    }
  };
  return (
    <>
      <Head>
        <title>Project Overwatch</title>
      </Head>
      {domain && (
        <>
          <h1>this is the detailed domain page for domain {domain.id} </h1>
          <div>
            {domain.domainName} ({domain.sourceSystem_Name}):
            {domain.dqchecks.length}
          </div>
          {domain.dqchecks.map((chk) => {
            return (
              <div className="collapse collapse-arrow" key={chk.id}>
                <input
                  type="checkbox"
                  className="peer"
                  checked={chk.id == openCheckID}
                  onChange={() => updateOpenCheckID(chk.id)}
                />
                <div
                  className="flex bg-gray-300 collapse-title font-medium rounded-t-2xl rounded-b-2xl peer-checked:rounded-b-none text-black peer-checked:text-white peer-checked:font-bold peer-checked:bg-green-500 shadow-md shadow-gray-500 peer-checked:shadow-green-500"
                  key={chk.id}
                >
                  <div className="flex">
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary mr-4 disabled:opacity-100 disabled:bg-warning disabled:checked:bg-info "
                      defaultChecked={chk.isActive == 1}
                      disabled
                    />
                  </div>
                  {chk.functionName}
                </div>
                <div className="collapse-content peer-checked:bg-green-100 rounded-b-2xl peer-checked:rounded-t-none mb-3 mt-0 shadow-md shadow-gray-500">
                  <div>{chk.explain}</div>
                  <div className="font-bold">Schedules</div>
                  <div>
                    {chk.showMySchedules.map((sms) => {
                      return (
                        <div key={sms.id}>
                          {sms.title}: {sms.days} - {sms.times} (Bank Hols?{" "}
                          {sms.includeBankHols == true ? `yes` : `no`})
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      <Link className="btn btn-primary" href="/domain">
        {" "}
        Back to Domain List
      </Link>
    </>
  );
}
