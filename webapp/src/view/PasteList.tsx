import { Box, Show, Icon, IconButton } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useStreamState } from "../state/stream";
import PasteItem from "./PasteItem";

function PasteList() {
  const { streamEvents } = useStreamState();
  const navigate = useNavigate();

  return (
    <>
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

      <Box pb={28} data-testid="paste-list">
        {streamEvents.map((e) => (
          <PasteItem paste={e} key={e.Id} />
        ))}
      </Box>
    </>
  );
}

export default PasteList;