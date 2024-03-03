import { Box, Show, Icon, IconButton } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useStream } from "../model/stream";
import PasteItem from "./PasteItem";

function PasteList() {
  const { streamEvents, addPasteText, deletePastes } = useStream();
  const navigate = useNavigate();

  return (
    <>
      {addPasteText && (
        <Show below="md">
          <IconButton
            position="fixed"
            bottom={8}
            right={8}
            zIndex={2}
            aria-label="Add"
            colorScheme="brand"
            width="64px"
            height="64px"
            borderRadius="16px"
            boxShadow="xl"
            icon={<Icon as={MdAdd} boxSize={8} />}
            onClick={() => navigate("/add-paste")}
          />
        </Show>
      )}

      <Box pt={6} pb={28} data-testid="paste-list">
        {streamEvents.map((e) => {
          switch (e.Kind) {
            case "PasteText":
              return <PasteItem paste={e} onDelete={deletePastes} key={e.Id} />;
          }
        })}
      </Box>
    </>
  );
}

export default PasteList;
